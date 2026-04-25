import type { FC } from 'react'

export const Bad: FC<{ items: string[] }> = ({ items }) => (
  <ul>
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
)
