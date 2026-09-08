import { defaultLocale, type Locale } from './config'

type MessageShape<Value> = Value extends string
  ? string
  : Value extends readonly unknown[]
    ? { readonly [Index in keyof Value]: MessageShape<Value[Index]> }
    : Value extends object
      ? { readonly [Key in keyof Value]: MessageShape<Value[Key]> }
      : Value

type TranslationLocales = Exclude<Locale, typeof defaultLocale>

/**
 * Uses the default-locale object as the required message schema. Adding or
 * removing a field therefore produces a type error in every shipped locale.
 */
export function defineMessages<
  const DefaultMessages,
  const Translations extends Record<TranslationLocales, MessageShape<DefaultMessages>>,
>(defaultMessages: DefaultMessages, translations: Translations) {
  return {
    [defaultLocale]: defaultMessages,
    ...translations,
  } as Record<Locale, MessageShape<DefaultMessages>>
}
