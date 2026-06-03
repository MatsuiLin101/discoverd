import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { PrismaClient } from "../src/generated/prisma/client";
import { uploadFile } from "../src/lib/cloudinary";
import { randomBytes } from "crypto";

expand(config({ path: ".env.local" }));

const db = new PrismaClient();

const TAGS = [
  "文化探索",
  "美食體驗",
  "自然景觀",
  "家庭旅遊",
  "蜜月之旅",
  "戶外冒險",
  "城市漫遊",
  "奢華享受",
  "背包旅行",
  "古蹟巡禮",
];

const REGIONS = [
  {
    name: "日本",
    slug: "japan",
    subRegions: [
      {
        name: "東京都會",
        slug: "tokyo",
        tours: [
          { name: "東京都會 5 日精華遊", price: 45000 },
          { name: "東京迪士尼親子遊", price: 38000 },
        ],
      },
      {
        name: "京阪神",
        slug: "kansai",
        tours: [
          { name: "京阪神賞楓 7 日行", price: 52000 },
          { name: "大阪美食深度遊", price: 32000 },
        ],
      },
    ],
  },
  {
    name: "泰國",
    slug: "thailand",
    subRegions: [
      {
        name: "曼谷周邊",
        slug: "bangkok",
        tours: [
          { name: "曼谷廟宇文化探索", price: 22000 },
          { name: "曼谷精品購物 4 日遊", price: 18000 },
        ],
      },
      {
        name: "清邁北部",
        slug: "chiangmai",
        tours: [
          { name: "清邁大象保育體驗", price: 25000 },
          { name: "清邁古城 3 日漫遊", price: 20000 },
        ],
      },
    ],
  },
  {
    name: "歐洲",
    slug: "europe",
    subRegions: [
      {
        name: "西歐精選",
        slug: "western-europe",
        tours: [
          { name: "法義西 10 日黃金路線", price: 120000 },
          { name: "英倫蘇格蘭浪漫遊", price: 95000 },
        ],
      },
      {
        name: "北歐風情",
        slug: "nordic",
        tours: [
          { name: "北歐極光追蹤 8 日", price: 150000 },
          { name: "北歐峽灣健行之旅", price: 110000 },
        ],
      },
    ],
  },
  {
    name: "東南亞",
    slug: "southeast-asia",
    subRegions: [
      {
        name: "峇里島",
        slug: "bali",
        tours: [
          { name: "峇里島蜜月奢華 5 日", price: 42000 },
          { name: "峇里島瑜珈冥想療癒", price: 35000 },
        ],
      },
      {
        name: "越南古城",
        slug: "vietnam",
        tours: [
          { name: "越南河內會安古城遊", price: 28000 },
          { name: "下龍灣郵輪 4 日行", price: 32000 },
        ],
      },
    ],
  },
];

async function fetchImage(
  width: number,
  height: number,
  seed: number
): Promise<Buffer> {
  const url = `https://picsum.photos/seed/${seed}/${width}/${height}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch picsum image: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const existing = await db.region.findFirst();
  if (existing) {
    console.log("Demo data already exists, skipping.");
    return;
  }

  console.log("Creating tags...");
  const createdTags = await Promise.all(
    TAGS.map((name) => db.tag.create({ data: { name } }))
  );

  let tourIndex = 0;

  for (let ri = 0; ri < REGIONS.length; ri++) {
    const regionData = REGIONS[ri];
    console.log(`\nCreating region: ${regionData.name}`);

    const regionThumb = await fetchImage(800, 534, ri * 10);
    const { url: regionUrl, publicId: regionPublicId } = await uploadFile(
      regionThumb,
      { folder: "regions", mimeType: "image/jpeg" }
    );

    const region = await db.region.create({
      data: {
        name: regionData.name,
        slug: regionData.slug,
        thumbnail: regionUrl,
        thumbnailPublicId: regionPublicId,
        sortOrder: ri,
      },
    });

    for (let si = 0; si < regionData.subRegions.length; si++) {
      const subData = regionData.subRegions[si];
      console.log(`  Creating subregion: ${subData.name}`);

      const subThumb = await fetchImage(800, 534, ri * 10 + si + 1);
      const { url: subUrl, publicId: subPublicId } = await uploadFile(
        subThumb,
        { folder: "regions", mimeType: "image/jpeg" }
      );

      const subRegion = await db.subRegion.create({
        data: {
          regionId: region.id,
          name: subData.name,
          slug: subData.slug,
          thumbnail: subUrl,
          thumbnailPublicId: subPublicId,
          sortOrder: si,
        },
      });

      for (let ti = 0; ti < subData.tours.length; ti++) {
        const tourData = subData.tours[ti];
        console.log(`    Creating tour: ${tourData.name}`);

        const tagSlice = [
          createdTags[tourIndex % TAGS.length],
          createdTags[(tourIndex + 1) % TAGS.length],
          createdTags[(tourIndex + 2) % TAGS.length],
        ];

        const tourThumb = await fetchImage(800, 534, tourIndex + 100);
        const { url: tourUrl, publicId: tourPublicId } = await uploadFile(
          tourThumb,
          { folder: "tours", mimeType: "image/jpeg" }
        );

        const slug = randomBytes(4).toString("hex");

        const tour = await db.tour.create({
          data: {
            subRegionId: subRegion.id,
            name: tourData.name,
            slug,
            thumbnail: tourUrl,
            thumbnailPublicId: tourPublicId,
            price: tourData.price,
            description: `${tourData.name}－精心規劃的旅遊行程，帶您探索當地最美的風景與文化。`,
            published: true,
            tags: { connect: tagSlice.map((t) => ({ id: t.id })) },
          },
        });

        const fileBuffer = await fetchImage(794, 2244, tourIndex + 200);
        const { url: fileUrl, publicId: filePublicId } = await uploadFile(
          fileBuffer,
          { folder: "tour-files", mimeType: "image/jpeg" }
        );

        await db.tourFile.create({
          data: {
            tourId: tour.id,
            url: fileUrl,
            publicId: filePublicId,
            mimeType: "image/jpeg",
            filename: "itinerary.jpg",
            sortOrder: 0,
          },
        });

        tourIndex++;
      }
    }
  }

  console.log(
    `\nDone! Created ${REGIONS.length} regions, ${REGIONS.length * 2} subregions, ${tourIndex} tours, ${tourIndex} tour files, ${TAGS.length} tags.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
