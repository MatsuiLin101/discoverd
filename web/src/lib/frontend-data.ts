export interface SearchItem {
  nm: string;
  region: string;
  tags: string[];
  price: string;
  img: string;
  kw: string;
}

export interface Tour {
  img: string;
  code: string;
  name: string;
  en: string;
  tags: string[];
  lede: string;
  dep: string;
  size: string;
  price: string;
  next: string;
}

export interface SubRegion {
  slug: string;
  zh: string;
  en: string;
  tours: Tour[];
}

export interface Region {
  slug: string;
  zh: string;
  en: string;
  count: string;
  img: string;
  subRegions: SubRegion[];
}

export const HERO_SLIDES = [
  { img: "https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=1800&q=80", alt: "北海道 美瑛" },
  { img: "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=1800&q=80", alt: "冰島 極光" },
  { img: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1800&q=80", alt: "義大利 托斯卡尼" },
  { img: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1800&q=80", alt: "京都 嵐山" },
];

export const REGIONS: Region[] = [
  {
    slug: "japan",
    zh: "日本",
    en: "Japan",
    count: "14",
    img: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=900&q=80",
    subRegions: [
      {
        slug: "hokkaido",
        zh: "北海道",
        en: "Hokkaido",
        tours: [
          {
            img: "https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=700&q=80",
            code: "JP-HKD-05",
            name: "北海道五日之旅",
            en: "Hokkaido in 5 Days",
            tags: ["5 天 4 夜", "經典首選"],
            lede: "札幌、小樽運河與函館百萬夜景一次收齊，主編精選三間在地食堂與一場大通公園的清晨。",
            dep: "03.18 / 04.08 / 05.06",
            size: "12 人小團",
            price: "42,800",
            next: "3 / 18",
          },
          {
            img: "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=700&q=80",
            code: "JP-HKD-07",
            name: "北海道七日親子滑雪",
            en: "Niseko Family Ski",
            tags: ["7 天 6 夜", "親子滑雪", "hot"],
            lede: "二世谷粉雪與富良野雪原，含兒童滑雪課程、雪上香蕉船與兩晚溫泉度假村。",
            dep: "01.22 / 02.05 / 02.19",
            size: "自由出發",
            price: "68,500",
            next: "1 / 22",
          },
          {
            img: "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=700&q=80",
            code: "JP-HKD-04",
            name: "道東祕境四日",
            en: "Eastern Hokkaido",
            tags: ["4 天 3 夜", "深度自然"],
            lede: "知床半島、釧路濕原與摩周湖，跟著在地嚮導走進丹頂鶴與流冰的世界。",
            dep: "02.12 / 03.05 / 03.26",
            size: "10 人小團",
            price: "54,200",
            next: "2 / 12",
          },
        ],
      },
      {
        slug: "tokyo",
        zh: "東京",
        en: "Tokyo",
        tours: [
          {
            img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=700&q=80",
            code: "JP-TYO-05",
            name: "東京五日自由行",
            en: "Tokyo Free & Easy",
            tags: ["5 天 4 夜", "半自助", "hot"],
            lede: "澀谷、淺草與台場任你安排，含三晚新宿精品酒店與一張主編三十間咖啡清單。",
            dep: "天天出發",
            size: "自由出發",
            price: "32,800",
            next: "隨時",
          },
          {
            img: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=700&q=80",
            code: "JP-TYO-03",
            name: "箱根河口湖溫泉三日",
            en: "Hakone & Fuji Onsen",
            tags: ["3 天 2 夜", "溫泉慢旅"],
            lede: "近郊溫泉雙城，一晚富士山景溫泉旅館、一段箱根登山纜車與蘆之湖的午後。",
            dep: "03.14 / 04.11 / 05.09",
            size: "16 人",
            price: "28,500",
            next: "3 / 14",
          },
          {
            img: "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=700&q=80",
            code: "JP-TYO-04",
            name: "東京迪士尼親子四日",
            en: "Tokyo Disney Family",
            tags: ["4 天 3 夜", "親子旅遊"],
            lede: "兩日樂園暢遊、園區飯店一晚、加上一場台場的海濱煙火與樂高樂園。",
            dep: "週四・週六出發",
            size: "自由出發",
            price: "39,800",
            next: "3 / 13",
          },
        ],
      },
      {
        slug: "kansai",
        zh: "關西",
        en: "Kansai",
        tours: [
          {
            img: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=700&q=80",
            code: "JP-KIX-05",
            name: "京都奈良五日",
            en: "Kyoto & Nara",
            tags: ["5 天 4 夜", "深度文化", "hot"],
            lede: "嵐山竹林、哲學之道與奈良小鹿，避開人潮的清晨參拜與兩間百年茶屋。",
            dep: "03.20 / 04.03 / 04.17",
            size: "12 人小團",
            price: "46,800",
            next: "3 / 20",
          },
          {
            img: "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=700&q=80",
            code: "JP-KIX-04",
            name: "大阪環球影城四日",
            en: "Osaka USJ",
            tags: ["4 天 3 夜", "親子樂園"],
            lede: "兩日環球影城快速通關、心齋橋逛街與道頓堀美食巡禮，一晚海遊館旁飯店。",
            dep: "天天出發",
            size: "自由出發",
            price: "35,500",
            next: "隨時",
          },
          {
            img: "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4?w=700&q=80",
            code: "JP-KIX-07",
            name: "關西深度七日",
            en: "Grand Kansai",
            tags: ["7 天 6 夜", "深度文化"],
            lede: "京都、大阪、神戶與姬路城，六座 UNESCO 古蹟、一段保津川泛舟與和牛饗宴。",
            dep: "04.10 / 05.08 / 06.05",
            size: "14 人",
            price: "62,800",
            next: "4 / 10",
          },
        ],
      },
      {
        slug: "kyushu",
        zh: "九州",
        en: "Kyushu",
        tours: [
          {
            img: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=700&q=80",
            code: "JP-FUK-06",
            name: "九州溫泉六日",
            en: "Kyushu Onsen",
            tags: ["6 天 5 夜", "溫泉慢旅", "hot"],
            lede: "別府地獄、由布院與黑川溫泉，三晚不同泉質的溫泉旅館與一場阿蘇火山的草原。",
            dep: "03.16 / 04.13 / 05.11",
            size: "12 人小團",
            price: "52,800",
            next: "3 / 16",
          },
          {
            img: "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=700&q=80",
            code: "JP-FUK-05",
            name: "福岡熊本五日",
            en: "Fukuoka & Kumamoto",
            tags: ["5 天 4 夜", "城市美食"],
            lede: "博多屋台、太宰府天滿宮與熊本城，一段九州新幹線與一晚柳川水鄉。",
            dep: "03.22 / 04.19 / 05.17",
            size: "16 人",
            price: "41,500",
            next: "3 / 22",
          },
        ],
      },
      {
        slug: "shikoku",
        zh: "四國",
        en: "Shikoku",
        tours: [
          {
            img: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=700&q=80",
            code: "JP-SHK-06",
            name: "四國祕境六日",
            en: "Hidden Shikoku",
            tags: ["6 天 5 夜", "深度自然"],
            lede: "道後溫泉、大步危峽谷與祖谷藤蔓橋，跟著在地嚮導走進最少人造訪的山中祕境。",
            dep: "04.08 / 05.13 / 06.10",
            size: "10 人小團",
            price: "58,200",
            next: "4 / 8",
          },
        ],
      },
      {
        slug: "okinawa",
        zh: "沖繩",
        en: "Okinawa",
        tours: [
          {
            img: "https://images.unsplash.com/photo-1528127269322-539801943592?w=700&q=80",
            code: "JP-OKA-05",
            name: "沖繩親子五日",
            en: "Okinawa Family",
            tags: ["5 天 4 夜", "親子半自助", "hot"],
            lede: "美麗海水族館、海中道路與古宇利島，三晚海景度假村、兩日專車包車的鬆散節奏。",
            dep: "天天出發",
            size: "自由出發",
            price: "38,500",
            next: "隨時",
          },
        ],
      },
    ],
  },
  {
    slug: "korea",
    zh: "韓國",
    en: "Korea",
    count: "8",
    img: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=900&q=80",
    subRegions: [
      {
        slug: "seoul",
        zh: "首爾",
        en: "Seoul",
        tours: [
          {
            img: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=700&q=80",
            code: "KR-SEO-04",
            name: "首爾美食與宮殿四日",
            en: "Seoul Food & Palaces",
            tags: ["4 天 3 夜", "美食購物", "hot"],
            lede: "景福宮、弘大夜市與南山塔，含韓式炸雞、銅板烤肉的道地美食路線。",
            dep: "天天出發",
            size: "自由出發",
            price: "25,900",
            next: "隨時",
          },
        ],
      },
      {
        slug: "busan",
        zh: "釜山",
        en: "Busan",
        tours: [
          {
            img: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=700&q=80",
            code: "KR-BUS-05",
            name: "釜山海雲台五日",
            en: "Busan & Haeundae",
            tags: ["5 天 4 夜", "海景文化"],
            lede: "海雲台沙灘、甘川文化村與廣安里煙火，含一晚海景飯店與在地海鮮饗宴。",
            dep: "03.15 / 04.12 / 05.10",
            size: "14 人",
            price: "28,500",
            next: "3 / 15",
          },
        ],
      },
    ],
  },
  {
    slug: "europe",
    zh: "歐洲",
    en: "Europe",
    count: "22",
    img: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=900&q=80",
    subRegions: [
      {
        slug: "iceland",
        zh: "冰島",
        en: "Iceland",
        tours: [
          {
            img: "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=700&q=80",
            code: "EU-ICL-08",
            name: "冰島環島極光八日",
            en: "Iceland Northern Lights",
            tags: ["8 天 7 夜", "極光獵旅", "hot"],
            lede: "黃金圈、黑沙灘與冰川健行，夜宿玻璃屋等待極光，附專業嚮導全程解說。",
            dep: "01.20 / 02.03 / 02.17",
            size: "10 人小團",
            price: "128,000",
            next: "1 / 20",
          },
        ],
      },
      {
        slug: "italy",
        zh: "義大利",
        en: "Italy",
        tours: [
          {
            img: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=700&q=80",
            code: "EU-ITA-09",
            name: "托斯卡尼莊園九日",
            en: "Tuscany Estate",
            tags: ["9 天 8 夜", "莊園美食"],
            lede: "佛羅倫斯、錫耶納與奇揚地莊園，兩晚農莊住宿、品酒課程與橄欖油工坊體驗。",
            dep: "04.10 / 05.08 / 09.18",
            size: "12 人小團",
            price: "138,000",
            next: "4 / 10",
          },
        ],
      },
    ],
  },
  {
    slug: "southeast-asia",
    zh: "東南亞",
    en: "Southeast Asia",
    count: "11",
    img: "https://images.unsplash.com/photo-1528127269322-539801943592?w=900&q=80",
    subRegions: [
      {
        slug: "bali",
        zh: "峇里島",
        en: "Bali",
        tours: [
          {
            img: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=700&q=80",
            code: "SA-BAL-05",
            name: "峇里島烏布療癒五日",
            en: "Bali Ubud Retreat",
            tags: ["5 天 4 夜", "療癒 SPA", "hot"],
            lede: "烏布森林步道、梯田日出與傳統巴里按摩，兩晚無邊際泳池Villa的奢華靜謐。",
            dep: "天天出發",
            size: "自由出發",
            price: "32,900",
            next: "隨時",
          },
        ],
      },
      {
        slug: "chiangmai",
        zh: "清邁",
        en: "Chiang Mai",
        tours: [
          {
            img: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=700&q=80",
            code: "SA-CNX-05",
            name: "清邁古城咖啡五日",
            en: "Chiang Mai Old City",
            tags: ["5 天 4 夜", "咖啡古城"],
            lede: "古城寺廟巡禮、夜間市集與山林咖啡農莊，附一日大象保育營體驗行程。",
            dep: "03.18 / 04.08 / 05.06",
            size: "14 人",
            price: "26,800",
            next: "3 / 18",
          },
        ],
      },
    ],
  },
  {
    slug: "china",
    zh: "中國",
    en: "China",
    count: "6",
    img: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=900&q=80",
    subRegions: [
      {
        slug: "zhangjiajie",
        zh: "張家界",
        en: "Zhangjiajie",
        tours: [
          {
            img: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=700&q=80",
            code: "CN-ZJJ-06",
            name: "張家界天門山六日",
            en: "Zhangjiajie & Tianmen",
            tags: ["6 天 5 夜", "奇景健行"],
            lede: "阿凡達取景地武陵源、天門山玻璃棧道與鳳凰古城，附觀光纜車全票。",
            dep: "03.20 / 04.17 / 05.15",
            size: "16 人",
            price: "34,900",
            next: "3 / 20",
          },
        ],
      },
    ],
  },
  {
    slug: "domestic",
    zh: "國旅",
    en: "Taiwan",
    count: "7",
    img: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=900&q=80",
    subRegions: [
      {
        slug: "hualien",
        zh: "花蓮",
        en: "Hualien",
        tours: [
          {
            img: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=700&q=80",
            code: "TW-HUA-03",
            name: "花蓮太魯閣三日",
            en: "Hualien Taroko",
            tags: ["3 天 2 夜", "山海輕旅行", "hot"],
            lede: "太魯閣峽谷步道、七星潭礫石灘與洄瀾灣市集，搭乘普悠瑪號往返雙鐵之旅。",
            dep: "週五・週六出發",
            size: "自由出發",
            price: "12,800",
            next: "3 / 14",
          },
        ],
      },
    ],
  },
];

export const SEARCH_DATA: SearchItem[] = [
  { nm: "北海道 美瑛・富良野 花田", region: "日本", tags: ["花季", "溫泉", "5 日"], price: "42,900", img: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=200&q=70", kw: "北海道 美瑛 富良野 花 日本 hokkaido" },
  { nm: "京都 嵐山・嵯峨野祕境", region: "日本", tags: ["世界遺產", "美食", "6 日"], price: "48,500", img: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=200&q=70", kw: "京都 嵐山 嵯峨野 日本 kyoto" },
  { nm: "沖繩 離島跳島漫遊", region: "日本", tags: ["海島", "跳島", "5 日"], price: "39,800", img: "https://images.unsplash.com/photo-1528127269322-539801943592?w=200&q=70", kw: "沖繩 離島 跳島 日本 okinawa 海" },
  { nm: "首爾 美食與宮殿散策", region: "韓國", tags: ["美食", "購物", "4 日"], price: "25,900", img: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=200&q=70", kw: "首爾 韓國 美食 宮殿 seoul" },
  { nm: "釜山 海雲台・甘川文化村", region: "韓國", tags: ["海景", "文化", "5 日"], price: "28,500", img: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=200&q=70", kw: "釜山 韓國 海雲台 甘川 busan" },
  { nm: "冰島 環島・極光獵旅", region: "歐洲", tags: ["極光", "環島", "8 日"], price: "128,000", img: "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=200&q=70", kw: "冰島 歐洲 極光 環島 iceland 北歐" },
  { nm: "義大利 托斯卡尼莊園", region: "歐洲", tags: ["莊園", "美食", "9 日"], price: "138,000", img: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=200&q=70", kw: "義大利 托斯卡尼 歐洲 italy tuscany" },
  { nm: "峇里島 烏布森林療癒", region: "東南亞", tags: ["療癒", "SPA", "5 日"], price: "32,900", img: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=200&q=70", kw: "峇里島 烏布 東南亞 bali 印尼" },
  { nm: "清邁 古城與山林咖啡", region: "東南亞", tags: ["咖啡", "古城", "5 日"], price: "26,800", img: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=200&q=70", kw: "清邁 泰國 東南亞 chiang mai 咖啡" },
  { nm: "張家界 天門山奇景", region: "中國", tags: ["奇景", "健行", "6 日"], price: "34,900", img: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=200&q=70", kw: "張家界 天門山 中國 china" },
  { nm: "花蓮 太魯閣・海岸縱谷", region: "國旅", tags: ["山海", "輕旅行", "3 日"], price: "12,800", img: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=200&q=70", kw: "花蓮 太魯閣 國旅 台灣 taiwan" },
];
