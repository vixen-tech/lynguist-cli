// @ts-nocheck
import { useTranslations } from 'next-intl'

export default function NestedKeys() {
    const t = useTranslations('Profile')

    return (
        <div>
            <h1>{t('user.profile.name')}</h1>
            <p>{t('user.profile.email')}</p>
            <span>{t('user.settings.theme')}</span>
        </div>
    )
}
