// @ts-nocheck
import { useTranslation } from 'react-i18next'

export default function NestedKeys() {
    const { t } = useTranslation('Profile')

    return (
        <div>
            <h1>{t('user.profile.name')}</h1>
            <p>{t('user.profile.email')}</p>
            <span>{t('user.settings.theme')}</span>
        </div>
    )
}
