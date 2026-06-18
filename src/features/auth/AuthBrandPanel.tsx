import { useTranslation } from 'react-i18next'

/** 登录 / 注册共用的左侧品牌面板（紫蓝渐变 + 品牌 + 卖点 pills）。 */
export function AuthBrandPanel() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const pills = ['schema', 'perms', 'lineage', 'rls'] as const

  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(150deg,#2F6BFF_0%,#5B3FE0_55%,#7C3AED_100%)] p-12 text-white lg:flex lg:flex-1">
      <div className="relative z-10 flex items-center gap-3">
        <div className="flex size-[34px] items-center justify-center rounded-[9px] bg-white/15">
          <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth={2.2}
            strokeLinecap="round"
          >
            <path d="M9 3h6M9 3v5l-4.5 8A2.5 2.5 0 0 0 6.8 20h10.4a2.5 2.5 0 0 0 2.3-3.6L15 8V3" />
            <path d="M7.5 14h9" />
          </svg>
        </div>
        <div className="text-[18px] font-extrabold">{tc('app.shortName')}</div>
      </div>

      <div className="relative z-10 max-w-[440px]">
        <h1 className="text-[34px] leading-[1.25] font-extrabold tracking-tight">
          {t('login.brandHeadline')}
        </h1>
        <p className="mt-[18px] text-[15px] leading-[1.7] opacity-[0.86]">
          {t('login.brandSubtitle')}
        </p>
        <div className="mt-[26px] flex flex-wrap gap-2.5">
          {pills.map((p) => (
            <span
              key={p}
              className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold"
            >
              {t(`login.pills.${p}`)}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 text-[12.5px] opacity-70">
        {t('login.brandFootnote')}
      </div>

      <div className="absolute -right-24 -bottom-24 size-80 rounded-full bg-white/[0.07]" />
      <div className="absolute top-24 right-16 size-40 rounded-full bg-white/5" />
    </div>
  )
}
