export interface PublicApi {
  readonly version: string
}

export const create = (version: string): PublicApi => ({ version })
