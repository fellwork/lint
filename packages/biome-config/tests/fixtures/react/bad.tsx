import type { FC } from 'react'

interface Props {
  readonly items: readonly string[]
}

export const List: FC<Props> = ({ items }) => {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}
