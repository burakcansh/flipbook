# Flipbook — Dijital Kitap Oluşturucu

Gerçekçi 3D sayfa çevirme animasyonuyla dijital kitap/dergi oluştur, link ile paylaş.

## Çalıştırma

```bash
npm install
npm run dev
```

Tarayıcıdan `http://localhost:3000` adresini aç.

Prod build:

```bash
npm run build
npm start
```

## Teknik Yığın

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS**
- **Persistence:** dosya tabanlı JSON store (`data/db.json`). Tek düğümlü
  demo için yeterli; kitaplar ve `slug → kitap` eşlemesi kalıcı ve
  paylaşılabilir. `src/lib/db.ts` modülünü Prisma/SQLite ile değiştirmek
  çağıranları etkilemeden mümkün.

## Mimari

```
src/
  app/
    page.tsx                 # / — landing (ad girişi + paylaşım kodu)
    dashboard/page.tsx       # /dashboard — kitaplarım
    new/page.tsx             # /new — tema seçimi
    editor/[id]/page.tsx     # /editor/[id] — editör
    b/[slug]/page.tsx        # /b/[slug] — public flipbook (auth yok, OG meta)
    api/
      books/route.ts                 # GET liste / POST oluştur
      books/[id]/route.ts            # GET / PUT / DELETE
      books/[id]/publish/route.ts    # POST yayınla/kaldır (slug üretir)
      public/[slug]/route.ts         # GET public kitap
      video-meta/route.ts            # GET sunucu tarafı oEmbed
  components/
    TopBar, Editor, PageEditor, LivePreview,
    Flipbook, BookFace, ViewerScreen
  lib/
    types, themes, db, video, ids, owner, api, defaults, serverAuth
```

### Kimlik (Auth)

Parola yok. Kullanıcı ad girince tarayıcıda rastgele bir `ownerId`
üretilip `localStorage`'a yazılır ve API isteklerinde `x-owner-id`
başlığıyla gönderilir. "Kitaplarım" listesi bu ownerId'ye göre filtrelenir.
NextAuth ile genişletmek için `serverAuth.ts` tek dokunma noktası.

### Sayfa eşleştirme

Flipbook'ta kapağın iç-arka yüzü **1. sayfayı tek başına** taşır; sonraki
her yaprak 2 sayfa (ön + arka) taşır. Böylece hiçbir sayfa atlanmaz.
Bkz. `buildLeaves` — `src/components/Flipbook.tsx`.

### Canlı önizleme & kayıt

Editörde yazarken önizleme **her tuş vuruşunda** anında güncellenir
(lokal state). DB'ye yazma blur'da hemen, ara değişikliklerde ~900ms
debounce ile yapılır — sunucuya her tuşta istek atılmaz.
