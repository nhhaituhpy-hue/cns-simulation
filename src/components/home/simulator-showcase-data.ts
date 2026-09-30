import {
  getSimulatorCatalogueImage,
  type SimulatorCatalogueImage,
} from "@/modules/core/simulator-catalogue-images";
import type {
  SimulatorModuleDefinition,
  SimulatorModuleId,
  SimulatorModuleStatus,
} from "@/modules/core/types";

type ShowcaseImage = SimulatorCatalogueImage;

export type SimulatorShowcaseItem = {
  id: SimulatorModuleId;
  shortName: string;
  categoryLabel: string;
  summary: string;
  keyFacts: readonly string[];
  cardImage: ShowcaseImage;
  cardImageFit: "cover" | "contain";
  image: ShowcaseImage;
  imageAlt: string;
  imageFit: "cover" | "contain";
  status: SimulatorModuleStatus;
  href: string | null;
  blockDiagramHref: string | null;
};

type ShowcaseVisual = Omit<
  SimulatorShowcaseItem,
  "id" | "shortName" | "status" | "href" | "blockDiagramHref"
>;

const showcaseVisuals: Record<SimulatorModuleId, ShowcaseVisual> = {
  "dvor-1150": {
    categoryLabel: "Dẫn đường vô tuyến",
    summary:
      "Mô phỏng cabinet DVOR 1150 để luyện nhận diện module, theo dõi trạng thái và thực hiện quy trình kiểm tra.",
    keyFacts: [
      "Nhận diện các module chính trong cabinet.",
      "Theo dõi chỉ thị, nguồn và cảnh báo.",
      "Luyện thao tác theo quy trình tại trạm.",
    ],
    cardImage: getSimulatorCatalogueImage("dvor-1150"),
    cardImageFit: "cover",
    image: getSimulatorCatalogueImage("dvor-1150"),
    imageAlt: "Cabinet DVOR 1150 trong catalogue thiết bị mô phỏng",
    imageFit: "contain",
  },
  "dvor-1150a": {
    categoryLabel: "Dẫn đường vô tuyến",
    summary:
      "Mô phỏng PMDT DVOR 1150A, kết nối trạng thái giám sát với cấu hình thiết bị tại trạm DVOR/DME.",
    keyFacts: [
      "Đọc trạng thái trên giao diện PMDT.",
      "Đối chiếu màn hình với cấu hình thiết bị.",
      "Thực hành theo tình huống khai thác.",
    ],
    cardImage: getSimulatorCatalogueImage("dvor-1150a"),
    cardImageFit: "cover",
    image: getSimulatorCatalogueImage("dvor-1150a"),
    imageAlt: "Cabinet DVOR 1150A trong catalogue thiết bị mô phỏng",
    imageFit: "contain",
  },
  "dme-1119a": {
    categoryLabel: "Đo cự ly hàng không",
    summary:
      "Mô phỏng DME 1119A để luyện kiểm tra cấu hình, tín hiệu và chẩn đoán theo tình huống khai thác.",
    keyFacts: [
      "Quan sát luồng giữa anten, máy phát và máy thu.",
      "Kiểm tra cấu hình, tín hiệu và cảnh báo.",
      "Đánh giá thao tác theo kịch bản.",
    ],
    cardImage: getSimulatorCatalogueImage("dme-1119a"),
    cardImageFit: "cover",
    image: getSimulatorCatalogueImage("dme-1119a"),
    imageAlt: "Cabinet DME 1119A trong catalogue thiết bị mô phỏng",
    imageFit: "contain",
  },
  "dvor-220": {
    categoryLabel: "Dẫn đường vô tuyến",
    summary:
      "Mô phỏng PMDT/LMI MOPIENS 220 DVOR, tập trung vào giám sát trạng thái và xử lý tình huống.",
    keyFacts: [
      "Theo dõi các chỉ thị vận hành trên PMDT.",
      "Liên hệ trạng thái màn hình với thiết bị.",
      "Luyện kiểm tra theo tình huống.",
    ],
    cardImage: getSimulatorCatalogueImage("dvor-220"),
    cardImageFit: "cover",
    image: getSimulatorCatalogueImage("dvor-220"),
    imageAlt: "Cabinet MOPIENS 220 DVOR trong catalogue thiết bị mô phỏng",
    imageFit: "contain",
  },
  "dme-320": {
    categoryLabel: "Đo cự ly hàng không",
    summary:
      "Mô phỏng MOPIENS 320 DME, kết nối thao tác PMDT với cabinet và quy trình kiểm tra.",
    keyFacts: [
      "Nhận biết cabinet và giao diện PMDT.",
      "Thực hành quy trình kiểm tra hệ thống.",
      "Lặp lại tình huống bảo dưỡng có kiểm soát.",
    ],
    cardImage: getSimulatorCatalogueImage("dme-320"),
    cardImageFit: "cover",
    image: getSimulatorCatalogueImage("dme-320"),
    imageAlt: "Cabinet MOPIENS 320 DME trong catalogue thiết bị mô phỏng",
    imageFit: "contain",
  },
  "ads-b": {
    categoryLabel: "Giám sát hàng không",
    summary:
      "Không gian thực hành QCMS và terminal bảo trì cho giám sát dữ liệu ADS-B.",
    keyFacts: [
      "Theo dõi site monitoring trên QCMS.",
      "Thực hành đọc trạng thái theo kịch bản.",
      "Rèn phản ứng với thông tin giám sát.",
    ],
    cardImage: getSimulatorCatalogueImage("ads-b"),
    cardImageFit: "cover",
    image: getSimulatorCatalogueImage("ads-b"),
    imageAlt: "Thiết bị mặt đất ADS-B trong catalogue thiết bị mô phỏng",
    imageFit: "contain",
  },
  vhf: {
    categoryLabel: "Thông tin hàng không",
    summary:
      "Khung thực hành VHF cho thao tác, kiểm tra và mở rộng kịch bản thông tin hàng không.",
    keyFacts: [
      "Chuẩn bị nội dung theo phương pháp CBTA.",
      "Sẵn sàng bổ sung kịch bản khai thác.",
      "Định hướng học viên trước khi mở simulator.",
    ],
    cardImage: getSimulatorCatalogueImage("vhf"),
    cardImageFit: "contain",
    image: getSimulatorCatalogueImage("vhf"),
    imageAlt: "Biểu tượng mô phỏng hệ thống VHF",
    imageFit: "contain",
  },
  vsat: {
    categoryLabel: "Thông tin vệ tinh",
    summary:
      "Khung thực hành VSAT cho quy trình vận hành và bảo dưỡng thông tin vệ tinh.",
    keyFacts: [
      "Chuẩn bị nội dung theo phương pháp CBTA.",
      "Sẵn sàng bổ sung kịch bản vận hành và bảo dưỡng.",
      "Định hướng học viên trước khi mở simulator.",
    ],
    cardImage: getSimulatorCatalogueImage("vsat"),
    cardImageFit: "contain",
    image: getSimulatorCatalogueImage("vsat"),
    imageAlt: "Biểu tượng mô phỏng hệ thống VSAT",
    imageFit: "contain",
  },
};

export function createSimulatorShowcaseItem(
  module: SimulatorModuleDefinition,
): SimulatorShowcaseItem {
  const visual = showcaseVisuals[module.id];

  return {
    id: module.id,
    shortName: module.shortName,
    status: module.status,
    href: module.status === "available" ? module.routes.simulator : null,
    blockDiagramHref:
      module.id === "dvor-1150" || module.id === "dvor-1150a" || module.id === "dme-1119a" || module.id === "ads-b"
        ? `/simulator/${module.id}/block-diagram`
        : module.id === "dvor-220" || module.id === "dme-320"
          ? `/simulator/software/${module.id}/block-diagram`
        : null,
    ...visual,
  };
}
