<script>
    import { _ } from 'svelte-i18n'

    const greeting = $_('hello')
    const farewell = $_('goodbye')
</script>

<h1>{$_('title')}</h1>
<p>{greeting}</p>
<p>{farewell}</p>
