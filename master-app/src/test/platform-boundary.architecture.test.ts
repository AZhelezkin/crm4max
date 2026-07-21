import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'
import ts from 'typescript'

const PROJECT_ROOT = resolve(process.cwd())
const SOURCE_ROOT = join(PROJECT_ROOT, 'src')

const LEGACY_JAVASCRIPT_FILES = [
  'src/App.js',
  'src/main.js',
]

const LEGACY_JAVASCRIPT_WEB_APP_ALLOWLIST = [
  'src/App.js',
]

const WEB_APP_ALLOWLIST = [
  'src/App.tsx',
  'src/client/components/BottomNav.tsx',
  'src/client/pages/BookingDetailPage.tsx',
  'src/client/pages/ConfirmPage.tsx',
  'src/client/pages/MasterCardPage.tsx',
  'src/client/pages/PackageBookingPage.tsx',
  'src/client/pages/QRScanPage.tsx',
  'src/client/pages/ServiceDetailPage.tsx',
  'src/client/store/auth.store.ts',
  'src/components/BottomNav.tsx',
  'src/hooks/usePaymentsExport.ts',
  'src/lib/bridge.ts',
  'src/lib/calendar.ts',
  'src/pages/BlockedSubscriptionPage.tsx',
  'src/pages/BookingDetailPage.tsx',
  'src/pages/HomePage.tsx',
  'src/pages/SubscriptionPlanPage.tsx',
  'src/pages/WelcomePage.tsx',
  'src/standalone-pages/handoff/destination-selector/DestinationSelectorPage.tsx',
  'src/standalone-pages/handoff/destination-selector/useDestinationSelector.ts',
  'src/store/auth.store.ts',
]

const PROVIDER_LOCATIONS = {
  authEndpoint: [
    'src/App.tsx',
    'src/api/auth.api.ts',
    'src/client/api/auth.api.ts',
  ],
  masterToken: [
    'src/App.tsx',
    'src/api/client.ts',
    'src/api/upload.api.ts',
    'src/store/auth.store.ts',
  ],
  clientToken: [
    'src/client/api/client.ts',
    'src/client/store/auth.store.ts',
  ],
  maxDeepLink: [
    'src/client/pages/MasterCardPage.tsx',
    'src/pages/ShareLinkPage.tsx',
    'src/pages/SubscriptionSuccessPage.tsx',
  ],
  maxUiImport: [
    'src/components/onboardingShared.tsx',
    'src/main.tsx',
  ],
} as const

function collectSourceFiles(
  extensions: RegExp,
  directory = SOURCE_ROOT,
): string[] {
  return readdirSync(directory)
    .flatMap((entry) => {
      const absolute = join(directory, entry)
      if (statSync(absolute).isDirectory()) {
        if (entry === 'test') return []
        return collectSourceFiles(extensions, absolute)
      }
      if (!extensions.test(entry) || /\.(test|spec)\.[^.]+$/.test(entry) || entry.endsWith('.d.ts')) return []
      return [relative(PROJECT_ROOT, absolute).replace(/\\/g, '/')]
    })
    .sort()
}

function collectProductionSourceFiles() {
  return collectSourceFiles(/\.(ts|tsx)$/)
}

function collectLegacyJavaScriptFiles() {
  return collectSourceFiles(/\.(js|jsx)$/)
}

function filesContaining(pattern: RegExp) {
  return collectProductionSourceFiles().filter((path) => pattern.test(readFileSync(join(PROJECT_ROOT, path), 'utf8')))
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  if (
    ts.isParenthesizedExpression(expression)
    || ts.isAsExpression(expression)
    || ts.isTypeAssertionExpression(expression)
    || ts.isNonNullExpression(expression)
    || ts.isSatisfiesExpression(expression)
  ) {
    return unwrapExpression(expression.expression)
  }
  return expression
}

function collectStaticStrings(sourceFile: ts.SourceFile) {
  const values = new Map<string, string>()
  let changed = true

  const resolveString = (expression: ts.Expression): string | undefined => {
    const unwrapped = unwrapExpression(expression)
    if (ts.isStringLiteralLike(unwrapped)) return unwrapped.text
    if (ts.isIdentifier(unwrapped)) return values.get(unwrapped.text)
    if (ts.isBinaryExpression(unwrapped) && unwrapped.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = resolveString(unwrapped.left)
      const right = resolveString(unwrapped.right)
      return left === undefined || right === undefined ? undefined : left + right
    }
    return undefined
  }

  while (changed) {
    changed = false
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        const value = resolveString(node.initializer)
        if (value !== undefined && values.get(node.name.text) !== value) {
          values.set(node.name.text, value)
          changed = true
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
  }

  return { values, resolveString }
}

function hasProviderWebAppAccess(source: string) {
  const sourceFile = ts.createSourceFile('provider-scan.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const globalAliases = new Set(['window', 'globalThis', 'self'])
  const { resolveString } = collectStaticStrings(sourceFile)
  let changed = true

  const isGlobalReference = (expression: ts.Expression) => {
    const unwrapped = unwrapExpression(expression)
    return ts.isIdentifier(unwrapped) && globalAliases.has(unwrapped.text)
  }

  while (changed) {
    changed = false
    const collectAliases = (node: ts.Node) => {
      if (
        ts.isVariableDeclaration(node)
        && ts.isIdentifier(node.name)
        && node.initializer
        && isGlobalReference(node.initializer)
        && !globalAliases.has(node.name.text)
      ) {
        globalAliases.add(node.name.text)
        changed = true
      }
      if (
        ts.isBinaryExpression(node)
        && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
        && ts.isIdentifier(node.left)
        && isGlobalReference(node.right)
        && !globalAliases.has(node.left.text)
      ) {
        globalAliases.add(node.left.text)
        changed = true
      }
      ts.forEachChild(node, collectAliases)
    }
    collectAliases(sourceFile)
  }

  let found = false
  const visit = (node: ts.Node) => {
    if (found) return

    if (ts.isPropertyAccessExpression(node) && isGlobalReference(node.expression) && node.name.text === 'WebApp') {
      found = true
      return
    }
    if (ts.isElementAccessExpression(node) && isGlobalReference(node.expression)) {
      const property = node.argumentExpression ? resolveString(node.argumentExpression) : undefined
      if (property === 'WebApp' || property === undefined) {
        found = true
        return
      }
    }
    if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer && isGlobalReference(node.initializer)) {
      if (node.name.elements.some((element) => {
        const property = element.propertyName ?? element.name
        return ts.isIdentifier(property) && property.text === 'WebApp'
      })) {
        found = true
        return
      }
    }
    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression)
      && node.expression.expression.text === 'Reflect'
      && node.expression.name.text === 'get'
      && node.arguments[0]
      && isGlobalReference(node.arguments[0])
    ) {
      const property = node.arguments[1] ? resolveString(node.arguments[1]) : undefined
      if (property === 'WebApp' || property === undefined) {
        found = true
        return
      }
    }
    if (
      ts.isBinaryExpression(node)
      && node.operatorToken.kind === ts.SyntaxKind.InKeyword
      && resolveString(node.left) === 'WebApp'
      && isGlobalReference(node.right)
    ) {
      found = true
      return
    }

    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return found
}

function filesWithProviderWebAppAccess(paths = collectProductionSourceFiles()) {
  return paths.filter((path) => (
    hasProviderWebAppAccess(readFileSync(join(PROJECT_ROOT, path), 'utf8'))
  ))
}

function filesImportingExplicitJavaScript() {
  return collectProductionSourceFiles().filter((path) => {
    const source = readFileSync(join(PROJECT_ROOT, path), 'utf8')
    const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    let found = false
    const visit = (node: ts.Node) => {
      if (found) return
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
        && node.moduleSpecifier
        && ts.isStringLiteral(node.moduleSpecifier)
        && /\.(js|jsx)$/.test(node.moduleSpecifier.text)
      ) {
        found = true
        return
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
    return found
  })
}

function assertExactLocations(label: string, actual: readonly string[], expected: readonly string[]) {
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)
  const unexpected = actual.filter((path) => !expectedSet.has(path))
  const missing = expected.filter((path) => !actualSet.has(path))
  if (unexpected.length > 0 || missing.length > 0) {
    throw new Error(`${label} inventory mismatch; unexpected: ${unexpected.join(', ') || 'none'}; missing: ${missing.join(', ') || 'none'}`)
  }
}

describe('platform provider boundary architecture', () => {
  it('сохраняет exact anti-expansion allowlist provider WebApp callers', () => {
    const actual = filesWithProviderWebAppAccess()

    assertExactLocations('provider WebApp access', actual, WEB_APP_ALLOWLIST)
    expect(actual).toHaveLength(22)
  })

  it('изолирует tracked legacy JavaScript shadows от production imports', () => {
    const legacyJavaScript = collectLegacyJavaScriptFiles()

    assertExactLocations('legacy JavaScript source', legacyJavaScript, LEGACY_JAVASCRIPT_FILES)
    assertExactLocations(
      'legacy JavaScript WebApp access',
      filesWithProviderWebAppAccess(legacyJavaScript),
      LEGACY_JAVASCRIPT_WEB_APP_ALLOWLIST,
    )
    expect(filesImportingExplicitJavaScript()).toEqual([])
    expect(readFileSync(join(PROJECT_ROOT, 'index.html'), 'utf8')).not.toMatch(/src\/main\.js/)
  })

  it('сохраняет reviewed provider auth, token, link и MaxUI locations', () => {
    assertExactLocations('auth endpoint', filesContaining(/\/auth\/max/), PROVIDER_LOCATIONS.authEndpoint)
    assertExactLocations('master token', filesContaining(/masterToken/), PROVIDER_LOCATIONS.masterToken)
    assertExactLocations('client token', filesContaining(/clientToken/), PROVIDER_LOCATIONS.clientToken)
    assertExactLocations('MAX deep link', filesContaining(/https:\/\/max\.ru/), PROVIDER_LOCATIONS.maxDeepLink)
    assertExactLocations('MaxUI import', filesContaining(/@maxhub\/max-ui/), PROVIDER_LOCATIONS.maxUiImport)
  })

  it('фиксирует единственный MAX SDK bootstrap и package dependency', () => {
    const indexHtml = readFileSync(join(PROJECT_ROOT, 'index.html'), 'utf8')
    const packageJson = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
    }

    expect(indexHtml.match(/https:\/\/st\.max\.ru\/js\/max-web-app\.js/g)).toHaveLength(1)
    expect(packageJson.dependencies?.['@maxhub/max-ui']).toBe('^0.1.13')
  })

  it('делает намеренное provider-caller expansion красным до manifest review', () => {
    const expanded = [...filesWithProviderWebAppAccess(), 'src/new-provider-caller.ts']

    expect(() => assertExactLocations('provider WebApp access', expanded, WEB_APP_ALLOWLIST))
      .toThrow('unexpected: src/new-provider-caller.ts')
  })

  it.each([
    "window['WebApp']?.ready()",
    "const root = window; root.WebApp?.ready()",
    "const key = 'Web' + 'App'; window[key]?.ready()",
    'const { WebApp } = globalThis; WebApp?.ready()',
    "Reflect.get(self, 'WebApp')?.ready()",
  ])('обнаруживает provider access вне literal window.WebApp: %s', (source) => {
    expect(hasProviderWebAppAccess(source)).toBe(true)
  })
})
