export const SUPPORTED_LOCALES = ['en-US', 'pt-BR'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export type TranslationKey =
  | 'app.name'
  | 'nav.home'
  | 'nav.items'
  | 'nav.categories'
  | 'nav.outfits'
  | 'nav.laundry'
  | 'nav.settings'
  | 'theme.switchToDark'
  | 'theme.switchToLight'
  | 'settings.title'
  | 'settings.subtitle'
  | 'settings.language.title'
  | 'settings.language.description'
  | 'settings.language.label'
  | 'settings.language.enUS'
  | 'settings.language.ptBR'
  | 'settings.theme.title'
  | 'settings.theme.description'
  | 'settings.theme.toLight'
  | 'settings.theme.toDark'
  | 'settings.backup.title'
  | 'settings.backup.description'
  | 'settings.backup.preparing'
  | 'settings.backup.download'
  | 'settings.backup.restoring'
  | 'settings.backup.restore'
  | 'settings.storage.title'
  | 'settings.storage.description'
  | 'settings.storage.reset'
  | 'settings.confirm.reset'
  | 'settings.confirm.restore'
  | 'settings.message.resetDone'
  | 'settings.message.backupDone'
  | 'settings.message.restoreDone'
  | 'settings.error.backup'
  | 'settings.error.restore'
  | 'dashboard.title'
  | 'dashboard.subtitle'
  | 'dashboard.addItem'
  | 'dashboard.createOutfit'
  | 'dashboard.catalogSize'
  | 'dashboard.itemsCount'
  | 'dashboard.favoriteOutfits'
  | 'dashboard.viewItems'
  | 'dashboard.manageOutfits'
  | 'dashboard.brandTag.catalog'
  | 'dashboard.brandTag.laundry'
  | 'dashboard.brandTag.styles'

type TranslationMap = Record<TranslationKey, string>

export const translations: Record<Locale, TranslationMap> = {
  'en-US': {
    'app.name': 'ClothePickr',
    'nav.home': 'Home',
    'nav.items': 'Items',
    'nav.categories': 'Categories',
    'nav.outfits': 'Outfits',
    'nav.laundry': 'Laundry',
    'nav.settings': 'Settings',
    'theme.switchToDark': 'Switch to dark mode',
    'theme.switchToLight': 'Switch to light mode',
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage local app data and environment info.',
    'settings.language.title': 'Language',
    'settings.language.description':
      "Use your device language by default, then enforce your preference here.",
    'settings.language.label': 'App language',
    'settings.language.enUS': 'English (US)',
    'settings.language.ptBR': 'Portuguese (Brazil)',
    'settings.theme.title': 'Theme',
    'settings.theme.description': 'Toggle between light and dark mode.',
    'settings.theme.toLight': 'Switch to light mode',
    'settings.theme.toDark': 'Switch to dark mode',
    'settings.backup.title': 'Backup and restore',
    'settings.backup.description':
      'Export your local IndexedDB data to JSON and restore it later on this device.',
    'settings.backup.preparing': 'Preparing backup...',
    'settings.backup.download': 'Download backup',
    'settings.backup.restoring': 'Restoring...',
    'settings.backup.restore': 'Restore backup',
    'settings.storage.title': 'Local storage',
    'settings.storage.description':
      'ClothePickr v1 stores all information in your browser IndexedDB.',
    'settings.storage.reset': 'Reset all local data',
    'settings.confirm.reset': 'Reset all local ClothePickr data? This cannot be undone.',
    'settings.confirm.restore':
      'Restore this backup now? Current local data will be replaced.',
    'settings.message.resetDone': 'Local data reset complete.',
    'settings.message.backupDone': 'Backup file downloaded.',
    'settings.message.restoreDone': 'Backup restored successfully.',
    'settings.error.backup': 'Could not create backup.',
    'settings.error.restore': 'Could not restore backup.',
    'dashboard.title': 'Wardrobe Overview',
    'dashboard.subtitle': 'Track what is clean, what needs care, and your saved styles.',
    'dashboard.addItem': 'Add Item',
    'dashboard.createOutfit': 'Create Outfit',
    'dashboard.catalogSize': 'Catalog size',
    'dashboard.itemsCount': '{count} items',
    'dashboard.favoriteOutfits': 'Favorite outfits',
    'dashboard.viewItems': 'View Items',
    'dashboard.manageOutfits': 'Manage Outfits',
    'dashboard.brandTag.catalog': 'Catalog',
    'dashboard.brandTag.laundry': 'Laundry',
    'dashboard.brandTag.styles': 'Styles',
  },
  'pt-BR': {
    'app.name': 'ClothePickr',
    'nav.home': 'Início',
    'nav.items': 'Peças',
    'nav.categories': 'Categorias',
    'nav.outfits': 'Looks',
    'nav.laundry': 'Lavagem',
    'nav.settings': 'Configurações',
    'theme.switchToDark': 'Alternar para modo escuro',
    'theme.switchToLight': 'Alternar para modo claro',
    'settings.title': 'Configurações',
    'settings.subtitle': 'Gerencie dados locais e preferências do aplicativo.',
    'settings.language.title': 'Idioma',
    'settings.language.description':
      'Por padrão usamos o idioma do dispositivo. Aqui você pode fixar sua preferência.',
    'settings.language.label': 'Idioma do aplicativo',
    'settings.language.enUS': 'Inglês (EUA)',
    'settings.language.ptBR': 'Português (Brasil)',
    'settings.theme.title': 'Tema',
    'settings.theme.description': 'Alterne entre modo claro e escuro.',
    'settings.theme.toLight': 'Alternar para modo claro',
    'settings.theme.toDark': 'Alternar para modo escuro',
    'settings.backup.title': 'Backup e restauração',
    'settings.backup.description':
      'Exporte os dados locais do IndexedDB para JSON e restaure depois neste dispositivo.',
    'settings.backup.preparing': 'Preparando backup...',
    'settings.backup.download': 'Baixar backup',
    'settings.backup.restoring': 'Restaurando...',
    'settings.backup.restore': 'Restaurar backup',
    'settings.storage.title': 'Armazenamento local',
    'settings.storage.description':
      'O ClothePickr v1 armazena todas as informações no IndexedDB do navegador.',
    'settings.storage.reset': 'Apagar todos os dados locais',
    'settings.confirm.reset': 'Apagar todos os dados locais do ClothePickr? Esta ação não pode ser desfeita.',
    'settings.confirm.restore':
      'Restaurar este backup agora? Os dados locais atuais serão substituídos.',
    'settings.message.resetDone': 'Dados locais apagados com sucesso.',
    'settings.message.backupDone': 'Arquivo de backup baixado.',
    'settings.message.restoreDone': 'Backup restaurado com sucesso.',
    'settings.error.backup': 'Não foi possível criar o backup.',
    'settings.error.restore': 'Não foi possível restaurar o backup.',
    'dashboard.title': 'Visão Geral do Guarda-Roupa',
    'dashboard.subtitle': 'Acompanhe o que está limpo, o que precisa de cuidado e seus looks salvos.',
    'dashboard.addItem': 'Adicionar peça',
    'dashboard.createOutfit': 'Criar look',
    'dashboard.catalogSize': 'Total de peças',
    'dashboard.itemsCount': '{count} peças',
    'dashboard.favoriteOutfits': 'Looks favoritos',
    'dashboard.viewItems': 'Ver peças',
    'dashboard.manageOutfits': 'Gerenciar looks',
    'dashboard.brandTag.catalog': 'Catálogo',
    'dashboard.brandTag.laundry': 'Lavagem',
    'dashboard.brandTag.styles': 'Estilos',
  },
}

