# Timeboard mobile (Android)

App para membros individuais (condóminos): login com Google ou email e senha, código de convite,
saldo devedor e prestações. O código está em `src/mobile/`; o Capacitor empacota o build
(`dist-mobile/`) no projeto Android em `android/`.

- ID da app (package): `app.timeboard.mobile` — **definitivo depois do primeiro envio à Play Store**
  (para mudar antes disso: `capacitor.config.json` e `android/app/build.gradle`).

## Desenvolvimento no browser

```bash
npm run server        # API (porta 3001)
npm run dev:mobile    # app mobile em http://localhost:5174
```

## Configuração (uma vez)

1. **Variáveis do build Android** — copie `.env.mobile.example` para `.env.production.local` e preencha:
   - `VITE_API_URL`: URL pública da API (Vercel).
   - `VITE_GOOGLE_WEB_CLIENT_ID`: o **Web client** OAuth usado no provider Google do Supabase.
2. **Google Cloud Console → Credentials** (mesmo projeto do Web client):
   - Criar um **OAuth client ID do tipo Android** com o package `app.timeboard.mobile` e o **SHA-1**
     do certificado. É preciso um client Android por certificado:
     - debug (testes locais): `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
     - upload key (a sua keystore de release) e **Play App Signing** (Play Console → Configuração → Integridade da app).
   - O ID do client Android **não** vai para a app; só o Web client (`VITE_GOOGLE_WEB_CLIENT_ID`).
3. **Supabase → Authentication → Providers → Google**: o Web client ID tem de estar configurado
   (é o mesmo do login Google da web).

## Gerar e testar

Requer o **Android Studio** (inclui o Android SDK).

```bash
npm run cap:sync      # build da app mobile + cópia para android/
npm run cap:open      # abre o projeto no Android Studio
```

No Android Studio: ligar um telemóvel (modo programador) ou criar um emulador e carregar em **Run**.

## Versão para a Play Store

1. Subir `versionCode` (inteiro, +1 em cada envio) e `versionName` em `android/app/build.gradle`.
2. `npm run cap:sync`.
3. Android Studio → **Build → Generate Signed App Bundle** → criar/usar a **upload key** (guarde a keystore
   e as senhas em local seguro, nunca no git) → gera o `.aab`.
4. Play Console: criar a app, preencher a ficha da loja, a política de privacidade, a segurança dos dados,
   o acesso à app (conta de teste para o revisor) e carregar o `.aab` numa faixa de teste
   (interno → fechado → produção).

## Ícone e splash

Coloque `assets/icon.png` (1024×1024) e `assets/splash.png` (2732×2732) e gere todas as resoluções:

```bash
npx @capacitor/assets generate --android
```
