export const number = (value: number) => new Intl.NumberFormat('es-PE').format(value)
export const date = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(value))
