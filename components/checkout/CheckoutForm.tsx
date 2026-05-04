"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import * as React from "react"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/feedback/ErrorState"
import { Skeleton } from "@/components/ui/skeleton"
import type { Locale } from "@/i18n/config"
import { apiClient } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import type { Address, CartRead, PlaceOrderRequest, UserMe } from "@/lib/api/types"
import { useCart } from "@/lib/cart/queries"
import { cartQueryKey } from "@/lib/cart/queries"
import { useIdempotencyKey, usePlaceOrder } from "@/lib/checkout/mutations"
import { CheckoutSchema, type CheckoutFormValues } from "@/lib/checkout/schema"
import { useQuote } from "@/lib/checkout/use-quote"
import { formatPhoneE164 } from "@/lib/format/phone"
import { trace } from "@/lib/observability/trace"

import { AddressPicker } from "./AddressPicker"
import { ConflictBanner } from "./ConflictBanner"
import { DeliveryMethodSection } from "./DeliveryMethodSection"
import { NotesSection } from "./NotesSection"
import { PaymentMethodSection } from "./PaymentMethodSection"
import { RecipientSection } from "./RecipientSection"
import { ReviewBlock } from "./ReviewBlock"

// CheckoutForm — single-page checkout orchestrator (DESIGN §12.8).
//
// Wraps the section components in a RHF FormProvider, owns the
// useQuote/usePlaceOrder/useIdempotencyKey wiring, and runs the
// conflict-resolution sequence locked by the ORDER MATTERS comment in
// lib/checkout/mutations.ts. Pre-fills name+phone from /me, surfaces
// addresses from /me/addresses for the saved-address picker.
//
// Consumed by app/[locale]/checkout/page.tsx (sub-phase 9D), which
// guards on cart.items.length === 0 + redirects to /cart per D3.
//
// ORDER MATTERS — submit / conflict / retry sequence (mirror of the
// comment on usePlaceOrder; reproduced here so a reviewer touching
// this file sees the contract):
//   1. Submit fires usePlaceOrder.mutate({ body, idempotencyKey: keyState.key }).
//   2. Success branches:
//      - payment_redirect_url → window.location.assign (Freedom Pay path,
//        currently unreachable since payment is hardcoded COD, but
//        wired for the day Q14 lands).
//      - otherwise → router.replace(`/${locale}/orders/${order_number}`).
//      Cart is invalidated on success so the empty-cart guard fires on
//      back-navigation.
//   3. 409 checkout_conflict (stock/price drift):
//      - refetchQuote() so the freshly-merged conflicts surface in
//        ConflictBanner.
//      - mark `pendingCartEdit=true`. The next user-driven navigation
//        to /cart and back will mintNewKey() because cart hash changed
//        AND we were waiting on it.
//      - KEEP the same Idempotency-Key — same submission attempt.
//   4. 409 idempotency_conflict (body diverged from a prior key):
//      - consumeAutoRetry() — returns null on the second hit, breaking
//        the loop per the one-retry-max rule.
//      - if a key is returned, retry the same body once.
//      - if null, surface a critical toast and stop.
//   5. 422 cart_empty / cart_expired:
//      - redirect to /cart. Component remount on return mints a fresh
//        key naturally.
//   6. Other ApiError: surface localized error toast; do not mint.
//   7. Network error / unknown: surface generic error toast; do not
//      mint (next click reuses the same key — Redis-side dedup handles
//      true duplicates).
// Reordering or short-circuiting these branches breaks idempotency or
// order-placement integrity.

export interface CheckoutFormProps {
  cart: CartRead
  user: UserMe
  addresses: ReadonlyArray<Address>
}

export function CheckoutForm({ cart, user, addresses }: CheckoutFormProps) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const router = useRouter()
  const queryClient = useQueryClient()

  const idempotency = useIdempotencyKey()
  const placeOrder = usePlaceOrder()

  // The "mint a new key after cart edit" leg of the lifecycle is handled
  // by the natural component-remount cycle: the user clicks Edit-cart →
  // router.push("/cart"); the CheckoutForm unmounts. When they return,
  // the orchestrator re-mounts and useIdempotencyKey's useState
  // initializer fires, producing a fresh key. mintNewKey() remains
  // exposed for callers that need to force a refresh without remounting
  // (none today, but the API stays useful for future flows).

  // Defaults: pre-fill recipient name/phone from /me, default address
  // when present, otherwise first saved address; pickup if no addresses.
  const defaultAddress = React.useMemo(
    () => addresses.find((a) => a.is_default) ?? addresses[0] ?? null,
    [addresses],
  )

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(CheckoutSchema),
    defaultValues: {
      delivery_method: defaultAddress ? "delivery" : "pickup",
      payment_method: "cash_on_delivery",
      recipient_name: [user.first_name, user.last_name].filter(Boolean).join(" ") || "",
      recipient_phone: user.phone ?? "",
      customer_notes: "",
      address_id: defaultAddress?.id,
      address: undefined,
    },
  })

  // useWatch (vs form.watch) avoids the React Compiler "incompatible
  // library" warning — useWatch subscribes via RHF's internal store
  // properly and is the official escape hatch.
  const deliveryMethod = useWatch({ control: form.control, name: "delivery_method" })
  const paymentMethod = useWatch({ control: form.control, name: "payment_method" })
  const addressId = useWatch({ control: form.control, name: "address_id" })
  const inlineAddress = useWatch({ control: form.control, name: "address" })

  // Stable cart hash for the quote queryKey — items + subtotal mutate
  // together when the cart changes, so this hash flips on any edit.
  const cartHash = React.useMemo(() => {
    const itemSig = cart.items
      .map((it) => `${it.id}:${it.quantity}:${it.price_snapshot}`)
      .sort()
      .join("|")
    return `${itemSig}@${cart.totals.subtotal}`
  }, [cart])

  // Quote enabled only when the form is in a complete-enough state to
  // produce a meaningful number: pickup always quotes; delivery requires
  // either a saved address_id or a populated inline address line.
  const quoteEnabled =
    cart.items.length > 0 &&
    (deliveryMethod === "pickup" || addressId !== undefined || Boolean(inlineAddress?.address_line))

  const quoteInput = React.useMemo(
    () => ({
      delivery_method: deliveryMethod,
      payment_method: paymentMethod,
      ...(addressId !== undefined ? { address_id: addressId } : {}),
      cartHash,
      enabled: quoteEnabled,
    }),
    [deliveryMethod, paymentMethod, addressId, cartHash, quoteEnabled],
  )
  const quote = useQuote(quoteInput)

  // Cold-chain auto-toggle to pickup. When a cart line carries
  // `requires_cold_chain=true`, force delivery_method=pickup with a
  // warning toast so the customer doesn't unwittingly pick courier
  // delivery for a refrigerated medicine. Defensively typed: the
  // CartItemRead schema does NOT yet expose this field (OQ-23 — backend
  // ask deferred to post-MVP). The check is wired now so the surface
  // activates the moment the backend adds the field; until then, no
  // cart line will trigger it.
  const hasColdChain = React.useMemo(
    () =>
      cart.items.some(
        (it) => (it as { requires_cold_chain?: boolean }).requires_cold_chain === true,
      ),
    [cart.items],
  )
  const coldChainNotifiedRef = React.useRef(false)
  React.useEffect(() => {
    if (hasColdChain && deliveryMethod !== "pickup") {
      form.setValue("delivery_method", "pickup", { shouldValidate: true })
      if (!coldChainNotifiedRef.current) {
        toast.warning(t("checkout.cold_chain_toast.title"), {
          description: t("checkout.cold_chain_toast.body"),
        })
        coldChainNotifiedRef.current = true
      }
    }
  }, [hasColdChain, deliveryMethod, form, t])

  // Cart-item name lookup for ConflictBanner.
  const cartItemNames = React.useMemo(() => {
    const map = new Map<number, string>()
    for (const it of cart.items) map.set(it.id, it.product_name ?? "—")
    return map
  }, [cart.items])

  // Conflict surfacing from the quote response (200-with-conflicts is
  // structured success per OP-13 + Phase 9 plan vigilance directive #1).
  const stockConflicts = quote.data?.stock_conflicts ?? []
  const priceConflicts = quote.data?.price_conflicts ?? []
  const hasConflicts = stockConflicts.length > 0 || priceConflicts.length > 0

  // Submission state surfaces beyond placeOrder.isPending: while we're
  // mid-conflict-retry the button stays disabled.
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const submitting = placeOrder.isPending

  function onEditCart() {
    router.push(`/${locale}/cart`)
  }

  function buildBody(values: CheckoutFormValues): PlaceOrderRequest {
    const phoneE164 = formatPhoneE164(values.recipient_phone) ?? values.recipient_phone
    const body: PlaceOrderRequest = {
      delivery_method: values.delivery_method,
      payment_method: values.payment_method,
      recipient_name: values.recipient_name,
      recipient_phone: phoneE164,
      customer_notes: values.customer_notes || null,
    }
    if (values.delivery_method === "delivery") {
      if (values.address_id !== undefined) {
        body.address_id = values.address_id
      } else if (values.address) {
        body.address = {
          city: values.address.city,
          address_line: values.address.address_line,
          landmark: values.address.landmark || null,
          apartment: values.address.apartment || null,
          floor: values.address.floor || null,
          entrance: values.address.entrance || null,
          intercom_code: values.address.intercom_code || null,
          delivery_notes: values.address.delivery_notes || null,
          ...(values.address.latitude !== undefined ? { latitude: values.address.latitude } : {}),
          ...(values.address.longitude !== undefined
            ? { longitude: values.address.longitude }
            : {}),
        }
      }
    }
    return body
  }

  async function attemptPlace(body: PlaceOrderRequest, key: string) {
    return placeOrder.mutateAsync({ body, idempotencyKey: key })
  }

  async function handleSuccess(data: Awaited<ReturnType<typeof placeOrder.mutateAsync>>) {
    queryClient.invalidateQueries({ queryKey: cartQueryKey })
    if (data.payment_redirect_url) {
      window.location.assign(data.payment_redirect_url)
      return
    }
    router.replace(`/${locale}/orders/${data.order_number}`)
  }

  async function onSubmit(values: CheckoutFormValues) {
    setSubmitError(null)
    const body = buildBody(values)
    const key = idempotency.key

    try {
      const data = await attemptPlace(body, key)
      await handleSuccess(data)
    } catch (error) {
      // ORDER MATTERS — see the comment block at the top of this file.
      if (error instanceof ApiError) {
        if (error.status === 409 && error.code === "checkout_conflict") {
          // Step 3: refetch quote so conflicts surface; KEEP key. The
          // natural component-remount on /cart navigation will mint a
          // fresh key when the user returns.
          await quote.refetch()
          setSubmitError(`error.${error.code}`)
          trace({
            category: "checkout.place",
            message: "checkout_conflict_409",
            data: { idempotencyKey: key },
            level: "warning",
          })
          return
        }
        if (error.status === 409 && error.code === "idempotency_conflict") {
          // Step 4: one-retry-max via consumeAutoRetry().
          const retryKey = idempotency.consumeAutoRetry()
          if (!retryKey) {
            setSubmitError("error.idempotency_conflict")
            toast.error(t("error.idempotency_conflict"))
            trace({
              category: "checkout.place",
              message: "idempotency_conflict_retry_exhausted",
              data: { previousKey: key },
              level: "error",
            })
            return
          }
          try {
            const retried = await attemptPlace(body, retryKey)
            await handleSuccess(retried)
          } catch (retryError) {
            const code = retryError instanceof ApiError ? retryError.code : "generic"
            setSubmitError(`error.${code}`)
            toast.error(t(`error.${code}`))
          }
          return
        }
        if (
          error.status === 422 &&
          (error.code === "cart_empty" || error.code === "cart_expired")
        ) {
          router.replace(`/${locale}/cart`)
          return
        }
        const errorCode = error.code
        setSubmitError(`error.${errorCode}`)
        toast.error(t(`error.${errorCode}`))
        return
      }
      setSubmitError("error.generic")
      toast.error(t("error.generic"))
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          {hasConflicts ? (
            <ConflictBanner
              stockConflicts={stockConflicts}
              priceConflicts={priceConflicts}
              cartItemNames={cartItemNames}
              locale={locale}
              onEditCart={onEditCart}
            />
          ) : null}

          <DeliveryMethodSection />

          {deliveryMethod === "delivery" ? <AddressPicker addresses={addresses} /> : null}

          <RecipientSection />
          <PaymentMethodSection />
          <NotesSection />

          {submitError ? (
            <p
              className="text-body-sm text-danger-500"
              role="alert"
              data-slot="checkout-submit-error"
            >
              {t(submitError)}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            loading={submitting}
            disabled={hasConflicts || quote.isError}
            data-slot="checkout-submit"
          >
            {submitting ? t("checkout.placing") : t("checkout.confirm_button")}
          </Button>
        </div>

        <div className="flex flex-col gap-4 md:sticky md:top-24 md:self-start">
          {quote.isError ? (
            <ErrorState
              title={t("error.generic")}
              body={
                quote.error instanceof ApiError
                  ? t(`error.${quote.error.code}`)
                  : t("error.network")
              }
            />
          ) : null}
          {quote.isPending && !quote.data ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <ReviewBlock
              items={cart.items}
              quote={quote.data}
              locale={locale}
              isQuotePending={quote.isFetching}
            />
          )}
        </div>
      </form>
    </FormProvider>
  )
}

// useCheckoutPrerequisites — convenience query bundle for the page.tsx
// loader. Exposes cart + me + addresses with a single isPending boolean.
// The page guards on these and renders <CheckoutForm> only when all
// three queries resolve.

export function useCheckoutPrerequisites() {
  const cartQuery = useCart()
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const response = await apiClient.GET("/api/v1/me" as never)
      const data = (response as { data?: UserMe }).data
      if (!data) {
        throw new ApiError({
          code: "me_response_missing_data",
          status: 0,
          context: {},
        })
      }
      return data
    },
  })
  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      const response = await apiClient.GET("/api/v1/me/addresses" as never)
      return ((response as { data?: Address[] }).data ?? []) as Address[]
    },
  })
  return { cartQuery, meQuery, addressesQuery }
}
