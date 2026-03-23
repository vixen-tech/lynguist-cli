// @ts-nocheck
import { useIntl } from 'react-intl'

export default function FormatMessage() {
    const intl = useIntl()

    return (
        <div>
            <h1>{intl.formatMessage({ id: 'page.title' })}</h1>
            <p>{intl.formatMessage({ id: 'page.description' })}</p>
        </div>
    )
}
