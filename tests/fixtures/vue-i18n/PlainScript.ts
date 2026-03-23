// @ts-nocheck
import { useI18n } from 'vue-i18n'

export function useLabels() {
    const { t } = useI18n()

    return {
        save: t('actions.save'),
        cancel: t('actions.cancel'),
        delete: t('actions.delete'),
    }
}
