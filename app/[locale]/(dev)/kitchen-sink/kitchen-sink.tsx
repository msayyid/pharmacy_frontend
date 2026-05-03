"use client"

import { MapPinIcon, PackageIcon, PillIcon, SearchIcon, WifiOffIcon } from "lucide-react"

import { BRAND } from "@/lib/brand"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { PriceTag } from "@/components/product/PriceTag"
import { StockPip } from "@/components/product/StockPip"
import { PhoneCallButton } from "@/components/support/PhoneCallButton"

// Real Bishkek-shaped data so we catch Cyrillic kerning + length issues at
// design time, not at Phase 6 (CLAUDE.md > No fake data outside tests). These
// values are illustrative — production product data comes from the backend.
const PHARMACY_ADDRESS = "мкр Асанбай 1/22, Бишкек"
const SUPPORT_PHONE_DISPLAY = "+996 312 95 23 41"
const PARACETAMOL = { name: "Парацетамол 500мг 12 таб", price: 45 }
const NUROFEN = { name: "Нурофен Экспресс 200мг 10 таб", price: 245, compareAt: 295 }
const VITAMIN_C = { name: "Витамин С 500мг 30 таб", price: 180 }
const ASPIRIN = { name: "Аспирин Кардио 100мг 30 таб", price: 320 }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-card ring-ink-200 flex flex-col gap-4 rounded-lg p-6 ring-1">
      <h2 className="text-h2 text-ink-800 font-semibold">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <span className="text-caption text-ink-500 min-w-32">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function KitchenSink() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-display text-ink-900 font-semibold">{BRAND.name} — kitchen sink</h1>
        <p className="text-body-lg text-ink-600">{BRAND.tagline.ru}</p>
        <p className="text-caption text-ink-500">
          Dev-only design-system showcase. Production builds return 404.
        </p>
      </header>

      <Section title="Buttons">
        <Row label="variants">
          <Button>Подтвердить заказ</Button>
          <Button variant="secondary">В корзину</Button>
          <Button variant="outline">Отмена</Button>
          <Button variant="ghost">Подробнее</Button>
          <Button variant="destructive">Удалить</Button>
          <Button variant="link">Забыли пароль?</Button>
        </Row>
        <Row label="sizes">
          <Button size="xs">XS</Button>
          <Button size="sm">SM</Button>
          <Button>Default</Button>
          <Button size="lg">LG</Button>
        </Row>
        <Row label="states">
          <Button disabled>Disabled</Button>
          <Button loading>Загрузка</Button>
          <Button variant="outline" loading>
            Загрузка
          </Button>
        </Row>
      </Section>

      <Section title="Badges">
        <Row label="variants">
          <Badge>Default</Badge>
          <Badge variant="success">В наличии</Badge>
          <Badge variant="warning">Срок истекает</Badge>
          <Badge variant="danger">Нет в наличии</Badge>
          <Badge variant="info">Действующее вещество</Badge>
        </Row>
      </Section>

      <Section title="Inputs">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ks-name">Имя получателя</Label>
            <Input id="ks-name" placeholder="Айжана Б." />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ks-phone">Телефон</Label>
            <Input id="ks-phone" type="tel" placeholder="+996 700 12 34 56" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ks-search">Поиск</Label>
            <div className="relative">
              <SearchIcon
                aria-hidden="true"
                className="text-ink-400 absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              />
              <Input id="ks-search" className="pl-8" placeholder="Парацетамол, аспирин..." />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ks-error">Поле с ошибкой</Label>
            <Input
              id="ks-error"
              defaultValue="0700"
              aria-invalid="true"
              aria-describedby="ks-error-msg"
            />
            <p id="ks-error-msg" className="text-caption text-danger-500">
              Номер должен начинаться с +996
            </p>
          </div>
        </div>
      </Section>

      <Section title="Cards (default + raised)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{PARACETAMOL.name}</CardTitle>
              <CardDescription>Анальгетик · Жаропонижающее</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <PriceTag price={PARACETAMOL.price} />
              <StockPip inStock label="В наличии" />
            </CardContent>
          </Card>
          <Card variant="raised">
            <CardHeader>
              <CardTitle>{NUROFEN.name}</CardTitle>
              <CardDescription>Нестероидный противовоспалительный препарат</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <PriceTag price={NUROFEN.price} compareAt={NUROFEN.compareAt} />
              <StockPip inStock label="В наличии" />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="StockPip">
        <Row label="states">
          <StockPip inStock label="В наличии" />
          <StockPip inStock={false} label="Нет в наличии" />
        </Row>
      </Section>

      <Section title="PriceTag (locale-aware money)">
        <Row label="ru — без сравнения">
          <PriceTag price={VITAMIN_C.price} locale="ru" />
        </Row>
        <Row label="ru — со старой ценой">
          <PriceTag price={NUROFEN.price} compareAt={NUROFEN.compareAt} locale="ru" />
        </Row>
        <Row label="ru — крупная сумма">
          <PriceTag price={12500} locale="ru" />
        </Row>
        <Row label="en — без сравнения">
          <PriceTag price={ASPIRIN.price} locale="en" />
        </Row>
        <Row label="en — со старой ценой">
          <PriceTag price={1250} compareAt={1480} locale="en" />
        </Row>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          icon={PackageIcon}
          title="Здесь появятся ваши заказы"
          body="Сделайте первый заказ — это просто. Мы доставим за пару часов."
          cta={<Button>На главную</Button>}
        />
      </Section>

      <Section title="ErrorState">
        <ErrorState
          icon={WifiOffIcon}
          title="Не удалось загрузить"
          body="Проверьте подключение и попробуйте снова."
          code="network"
          cta={<Button variant="outline">Повторить</Button>}
        />
      </Section>

      <Section title="PhoneCallButton">
        <Row label="без подписи">
          <PhoneCallButton />
        </Row>
        <Row label="с подписью">
          <PhoneCallButton label={SUPPORT_PHONE_DISPLAY} />
        </Row>
        <Row label="primary вариант">
          <PhoneCallButton variant="default" label={`Позвонить ${SUPPORT_PHONE_DISPLAY}`} />
        </Row>
      </Section>

      <Section title="Avatar · Skeleton · Separator · Label">
        <Row label="avatar">
          <Avatar>
            <AvatarFallback>АН</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>БС</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>ГЖ</AvatarFallback>
          </Avatar>
        </Row>
        <Row label="skeleton">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="rounded-pill size-12" />
        </Row>
        <Separator />
        <Row label="label">
          <Label>Адрес доставки</Label>
          <span className="text-body text-ink-700">{PHARMACY_ADDRESS}</span>
        </Row>
        <Row label="icon + text">
          <PillIcon className="text-brand-500 size-4" aria-hidden="true" />
          <span className="text-body text-ink-700">{PARACETAMOL.name}</span>
          <Separator orientation="vertical" className="h-4!" />
          <MapPinIcon className="text-brand-500 size-4" aria-hidden="true" />
          <span className="text-body text-ink-700">{PHARMACY_ADDRESS}</span>
        </Row>
      </Section>
    </main>
  )
}
