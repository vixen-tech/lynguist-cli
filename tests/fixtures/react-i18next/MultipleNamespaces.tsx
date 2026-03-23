// @ts-nocheck
import { useTranslation } from 'react-i18next'

export function Header() {
    const { t } = useTranslation('Header')

    return (
        <header>
            <h1>{t('logo')}</h1>
            <nav>{t('nav.home')}</nav>
        </header>
    )
}

export function Footer() {
    const { t: tFooter } = useTranslation('Footer')

    return (
        <footer>
            <p>{tFooter('copyright')}</p>
            <a>{tFooter('privacy_link')}</a>
        </footer>
    )
}
