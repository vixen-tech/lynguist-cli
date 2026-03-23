// @ts-nocheck
import { useTranslations } from 'next-intl'

export default function NoNamespace() {
    const t = useTranslations()

    return (
        <div>
            <h1>{t('global_title')}</h1>
            <p>{t('global_subtitle')}</p>
        </div>
    )
}
