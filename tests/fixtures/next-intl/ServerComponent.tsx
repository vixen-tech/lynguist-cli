// @ts-nocheck
import { getTranslations } from 'next-intl/server'

export default async function ServerComponent() {
    const t = await getTranslations('Settings')

    return (
        <div>
            <h1>{t('page_title')}</h1>
            <p>{t('description')}</p>
        </div>
    )
}
