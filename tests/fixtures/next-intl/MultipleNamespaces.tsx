// @ts-nocheck
import { useTranslations } from 'next-intl'

export default function MultipleNamespaces() {
    const t = useTranslations('Header')
    const tFooter = useTranslations('Footer')

    return (
        <div>
            <header>
                <h1>{t('logo')}</h1>
                <nav>{t('nav.home')}</nav>
            </header>
            <footer>
                <p>{tFooter('copyright')}</p>
                <a>{tFooter('privacy_link')}</a>
            </footer>
        </div>
    )
}
