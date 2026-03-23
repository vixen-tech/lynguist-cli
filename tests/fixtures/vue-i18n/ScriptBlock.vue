<script lang="ts">
// @ts-nocheck
import { defineComponent } from 'vue'
import { useI18n } from 'vue-i18n'

export default defineComponent({
    setup() {
        const { t } = useI18n()

        const title = t('setup.title')
        const subtitle = t('setup.subtitle')

        return { title, subtitle }
    },
})
</script>

<template>
    <div>
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
    </div>
</template>
