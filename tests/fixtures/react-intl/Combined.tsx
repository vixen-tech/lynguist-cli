// @ts-nocheck
import { FormattedMessage, useIntl } from 'react-intl'

export default function Combined() {
    const intl = useIntl()

    return (
        <div>
            <h1>{intl.formatMessage({ id: 'nav.title' })}</h1>
            <FormattedMessage id="nav.description" />
            <p>{intl.formatMessage({ id: 'nav.cta' })}</p>
        </div>
    )
}
