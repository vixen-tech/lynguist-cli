<script lang="ts" setup>
// @ts-nocheck
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const description = t('page.description')
</script>

<template>
    <div>
        <h1>{{ $t('page.title') }}</h1>
        <p>{{ description }}</p>
    </div>
</template>
