// @ts-nocheck
import { FormattedMessage } from 'react-intl'

export default function FormattedMessageComponent() {
    return (
        <div>
            <h1>
                <FormattedMessage id="hero.title" />
            </h1>
            <p>
                <FormattedMessage id="hero.subtitle" />
            </p>
        </div>
    )
}
