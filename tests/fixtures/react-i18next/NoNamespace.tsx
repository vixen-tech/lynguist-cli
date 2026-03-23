// @ts-nocheck
import { useTranslation } from 'react-i18next'

export default function NoNamespace() {
    const { t } = useTranslation()

    return (
        <div>
            <h1>{t('global_title')}</h1>
            <p>{t('global_subtitle')}</p>
        </div>
    )
}
