import { download, request } from '@/api/client'
import type { Paginated } from '@/api/types'

export type SignatureMeaning =
  | 'authored'
  | 'reviewed'
  | 'approved'
  | 'responsibility'

/** 电子签名记录（21 CFR Part 11）：不可改不可删。 */
export interface Signature {
  id: string
  project_id: string
  target_kind: string
  target_id: string
  signer_id: string
  signer_name: string
  meaning: SignatureMeaning
  reason: string
  content_hash: string
  signed_at: string
}

export interface SignBody {
  target_kind: string
  target_id: string
  meaning: SignatureMeaning
  reason: string
  content_hash: string
  /** 签署时重新认证（§11.200）。 */
  password: string
  /** 外部身份(SSO)用户再认证用的登录名；缺省回退到本人显示名。本地密码用户忽略。 */
  login_name?: string
}

const base = (projectId: string) => `/v1/projects/${projectId}/signatures`

export const signaturesApi = {
  list: (
    projectId: string,
    params: {
      target_kind?: string
      target_id?: string
      limit?: number
      offset?: number
    } = {},
  ) => request<Paginated<Signature>>(base(projectId), { query: { ...params } }),
  get: (projectId: string, sid: string) =>
    request<Signature>(`${base(projectId)}/${sid}`),
  sign: (projectId: string, body: SignBody) =>
    request<Signature>(base(projectId), { method: 'POST', body }),
  exportCsv: (
    projectId: string,
    params: { target_kind?: string; target_id?: string } = {},
  ) =>
    download(`${base(projectId)}/export`, 'signatures.csv', {
      query: { ...params },
    }),
}
