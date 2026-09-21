import type { Page } from '@playwright/test';

export const GetChipBalance = (Page: Page) =>
  Page.getByText('Fichas', { exact: true }).locator(
    'xpath=following-sibling::span'
  );

export const ParseChips = (Text: string) => Number(Text.replace(/\./g, ''));

export const FormatChips = (Value: number) => Value.toLocaleString('pt-BR');
