import { genId } from "./ids";
import type { Book, BookCover, BookPage, ImageMeta, ThemeKey } from "./types";

/**
 * Ready-made, fully editable magazine templates. Selecting one creates a real
 * book (owned by the user) pre-filled with cover + image/text pages, which can
 * then be edited like any other book.
 *
 * Images use picsum.photos (stable, deterministic per seed) so a freshly
 * created template looks great immediately and stays shareable.
 */

export interface BookTemplate {
  key: string;
  name: string;
  issue: string;
  description: string;
  themeKey: ThemeKey;
  /** preview image for the picker card */
  coverImage: string;
  cover: BookCover;
  pages: Omit<BookPage, "id">[];
}

const img = (seed: string, w = 1200, h = 800): string =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const image = (
  seed: string,
  alt: string,
  scale = 1,
  align: ImageMeta["align"] = "center"
): ImageMeta => ({ src: img(seed), alt, scale, align });

export const TEMPLATES: BookTemplate[] = [
  {
    key: "voyage",
    name: "VOYAGE",
    issue: "Yaz Sayısı",
    description: "Seyahat & keşif dergisi — Akdeniz özel sayısı",
    themeKey: "journal",
    coverImage: img("voyage-cover", 800, 1000),
    cover: {
      title: "VOYAGE",
      subtitle: "Akdeniz'in saklı koyları · Yaz Sayısı",
      image: img("voyage-cover", 800, 1100),
    },
    pages: [
      {
        kind: "image",
        image: image("voyage-1", "Gün doğumunda sakin bir koy"),
        caption: "Kaş, Antalya — günün ilk ışıkları",
      },
      {
        kind: "text",
        heading: "Editörden",
        body: "Bu sayıda pusulayı güneye çevirdik. Turkuaz sulara açılan dar patikaları, balıkçı kasabalarının sabah pazarlarını ve gün batımında rengi değişen kayalıkları takip ettik.\n\nYavaş seyahatin peşindeyiz: acele etmeden, her durağın hikâyesini dinleyerek.",
      },
      {
        kind: "image",
        image: image("voyage-2", "Ahşap bir tekne berrak suda"),
        caption: "Mavi yolculuk — günübirlik rotalar",
      },
      {
        kind: "text",
        heading: "Üç Durakta Rota",
        body: "1 · Saklı Liman — sabah erken, kalabalıktan önce.\n2 · Zeytinlikler arasında öğle molası.\n3 · Gün batımına yetişmek için batı burnu.\n\nİpucu: Yanına yumuşak tabanlı ayakkabı ve yeniden doldurulabilir matara al.",
      },
      {
        kind: "image",
        image: image("voyage-3", "Sahil kasabasında masada meze tabakları"),
        caption: "Sahilin lezzetleri — taze ve sade",
      },
      {
        kind: "text",
        heading: "Sonraki Sayıda",
        body: "Adalardan adalara: rüzgârın götürdüğü bir rota. Bizimle kalın.",
      },
    ],
  },
  {
    key: "gusto",
    name: "GUSTO",
    issue: "Mevsim Mutfağı",
    description: "Yemek & mutfak dergisi — şeflerin sırları",
    themeKey: "corporate",
    coverImage: img("gusto-cover", 800, 1000),
    cover: {
      title: "GUSTO",
      subtitle: "Mevsim mutfağı & şeflerin sırları",
      image: img("gusto-cover", 800, 1100),
    },
    pages: [
      {
        kind: "image",
        image: image("gusto-1", "Tahta tezgâhta taze sebzeler"),
        caption: "Pazardan tabağa — mevsimin rengi",
      },
      {
        kind: "text",
        heading: "Mevsimi Yemek",
        body: "İyi yemeğin sırrı malzemede saklı. Bu sayıda mevsiminde toplanan ürünlerle sade ama etkileyici tarifler hazırladık.\n\nİlke basit: az malzeme, doğru teknik, sabır.",
      },
      {
        kind: "image",
        image: image("gusto-2", "Tabakta özenle sunulmuş bir yemek"),
        caption: "Sunum da lezzetin parçasıdır",
      },
      {
        kind: "text",
        heading: "Şefin Notu",
        body: "“Tuzu en sona bırakma; her katmanda biraz ekle. Ateşi tanı, malzemeyle konuş.”\n\n— Konuk şefimizden üç kelimelik kural: dinle, dengele, sun.",
      },
      {
        kind: "image",
        image: image("gusto-3", "Buharı tüten taze pişmiş ekmek"),
        caption: "Sıcak ekmek — sofranın kalbi",
      },
      {
        kind: "text",
        heading: "Bu Hafta Dene",
        body: "Fırında mevsim sebzeleri, üzerine biraz zeytinyağı ve taze otlar. 200°C'de 25 dakika. Gerisi sofradaki sohbete kalmış.",
      },
    ],
  },
  {
    key: "form",
    name: "FORM",
    issue: "Tasarım & Mimari",
    description: "Çağdaş mimari ve iç mekân dergisi — minimal",
    themeKey: "corporate",
    coverImage: img("form-cover", 800, 1000),
    cover: {
      title: "FORM",
      subtitle: "Çağdaş mimari & iç mekân · Sayı 04",
      image: img("form-cover", 800, 1100),
    },
    pages: [
      {
        kind: "image",
        image: image("form-1", "Geometrik çizgili modern bir cephe"),
        caption: "Işık ve gölge ile tasarlanmış cephe",
      },
      {
        kind: "text",
        heading: "Boşluğun Tasarımı",
        body: "İyi mimari, eklediğiyle değil çıkardığıyla konuşur. Bu sayıda sadeliğin gücünü; ışığı, malzemeyi ve sessizliği bir araya getiren mekânları ele alıyoruz.",
      },
      {
        kind: "image",
        image: image("form-2", "Doğal ışık alan minimal bir iç mekân"),
        caption: "Az ama doğru — sakin bir oturma alanı",
      },
      {
        kind: "text",
        heading: "Üç Malzeme",
        body: "Beton · Ahşap · Cam.\n\nÜç dürüst malzeme, doğru oranlarda bir araya geldiğinde zamansız bir denge kuruyor. Detay, gösterişte değil birleşim yerlerinde gizli.",
      },
      {
        kind: "image",
        image: image("form-3", "Merdiven ve dokulu duvar detayı"),
        caption: "Detay, bütünü taşır",
      },
      {
        kind: "text",
        heading: "Stüdyo Ziyareti",
        body: "Gelecek sayıda genç bir tasarım stüdyosunun atölyesine konuk oluyoruz: maketler, eskizler ve bitmemiş fikirler arasında.",
      },
    ],
  },
  {
    key: "wild",
    name: "WILD",
    issue: "Doğa & Yaban Hayatı",
    description: "Doğa fotoğrafçılığı ve vahşi coğrafyalar dergisi",
    themeKey: "journal",
    coverImage: img("wild-cover", 800, 1000),
    cover: {
      title: "WILD",
      subtitle: "Yaban hayatı & vahşi coğrafyalar",
      image: img("wild-cover", 800, 1100),
    },
    pages: [
      {
        kind: "image",
        image: image("wild-1", "Sis içinde uzanan dağ silsilesi"),
        caption: "Şafakta dağlar — sessizliğin coğrafyası",
      },
      {
        kind: "text",
        heading: "Vahşinin İzinde",
        body: "Doğa, sabredeni ödüllendirir. Bu sayıda kameramızı ormanların derinliğine, nehirlerin kıyısına ve yüksek yaylalara taşıdık.\n\nİyi bir kare için kural tek: bekle, gözle, saygı duy.",
      },
      {
        kind: "image",
        image: image("wild-2", "Ormanda doğal yaşamdan bir an"),
        caption: "Doğal ortamında — müdahalesiz",
      },
      {
        kind: "text",
        heading: "Saha Notları",
        body: "Rüzgârı yüzüne al, gölgede kal, sesini kıs.\n\nEn iyi ışık gün doğumundan sonraki ilk saat ve gün batımından önceki son saat. Aceleci olan kareyi kaçırır.",
      },
      {
        kind: "image",
        image: image("wild-3", "Bir gölün üzerine vuran akşam ışığı"),
        caption: "Akşam ışığı — günün son nefesi",
      },
      {
        kind: "text",
        heading: "Koruyarak Keşfet",
        body: "Geride yalnızca ayak izi bırak. Gördüğümüz her vahşi güzellik, onu koruduğumuz sürece var olacak.",
      },
    ],
  },
];

export function getTemplate(key: string): BookTemplate | undefined {
  return TEMPLATES.find((t) => t.key === key);
}

export function createBookFromTemplate(
  ownerId: string,
  key: string
): Book | null {
  const t = getTemplate(key);
  if (!t) return null;
  const now = Date.now();
  return {
    id: genId("b_"),
    ownerId,
    themeKey: t.themeKey,
    cover: { ...t.cover },
    pages: t.pages.map((p) => ({
      ...p,
      id: genId("p_"),
      image: p.image ? { ...p.image } : p.image,
      video: p.video ? { ...p.video } : p.video,
    })),
    status: "draft",
    slug: null,
    createdAt: now,
    updatedAt: now,
  };
}
