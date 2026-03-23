// @ts-nocheck
import { useTranslations } from 'next-intl'

export default function RichText() {
    const t = useTranslations('Marketing')

    return (
        <div>
            <div>
                {t.rich('hero_title', {
                    bold: chunks => <strong>{chunks}</strong>,
                })}
            </div>
            <div>{t.markup('terms_html')}</div>
            <div>{t.raw('raw_content')}</div>
            <p>{t('plain_text')}</p>
        </div>
    )
}
