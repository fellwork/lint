import type { FC } from 'react'

interface Props {
  readonly name: string
}

export const Greeting: FC<Props> = ({ name }) => {
  return <span>{name}</span>
}
