export interface User {
  readonly id: string
  readonly name: string
}

export const formatUser = (user: User): string => {
  return `${user.name} (${user.id})`
}

export const users: readonly User[] = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
]
