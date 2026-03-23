// @ts-nocheck
import { FormattedMessage, useIntl } from 'react-intl'

export default function DefaultMessage() {
    const intl = useIntl()

    return (
        <div>
            <h1>{intl.formatMessage({ id: 'greeting', defaultMessage: 'Hello!' })}</h1>
            <FormattedMessage id="farewell" defaultMessage="Goodbye!" />
        </div>
    )
}
