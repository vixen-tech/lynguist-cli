// @ts-nocheck
import { useTranslations } from 'next-intl'

export default function BasicComponent() {
    const t = useTranslations('Dashboard')

    return (
        <div>
            <h1>{t('title')}</h1>
            <p>{t('welcome_message')}</p>
        </div>
    )
}
