// @ts-nocheck
import { getTranslations } from 'next-intl/server'

export default async function ObjectNamespace({ params }: { params: { locale: string } }) {
    const { locale } = params
    const t = await getTranslations({ locale, namespace: 'home' })
    const tMeta = await getTranslations({ locale, namespace: 'metadata.home' })

    return (
        <div>
            <h1>{t('title')}</h1>
            <p>{t('description')}</p>
            <p>{tMeta('seoTitle')}</p>
        </div>
    )
}
