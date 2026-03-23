<script>
    import { _, format, t } from 'svelte-i18n'

    const msg1 = $_('store.underscore')
    const msg2 = $t('store.t')
    const msg3 = $format('store.format')
</script>

<p>{msg1}</p>
<p>{msg2}</p>
<p>{msg3}</p>
