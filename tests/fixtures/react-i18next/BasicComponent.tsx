// @ts-nocheck
import { useTranslation } from 'react-i18next'

export default function BasicComponent() {
    const { t } = useTranslation('Dashboard')

    return (
        <div>
            <h1>{t('title')}</h1>
            <p>{t('welcome_message')}</p>
        </div>
    )
}
