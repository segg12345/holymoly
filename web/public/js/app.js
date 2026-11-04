/* ============================================================
   NHÀ HÀNG SEN VÀNG — ULTRA-PREMIUM DIGITAL EXPERIENCE CONTROLLER
   Entry Point & Event Delegation Orchestrator (ES Modules)
   ============================================================ */
import { $, $$, openModal, closeModal, closeDrawer } from './modules/core.js';
import { startClock, initAmbientCanvas, initCustomCursor, initCardTilt } from './modules/effects.js';
import { loadDashboard } from './modules/dashboard.js';
import {
  loadBan,
  setZone,
  clickBan,
  openMoHoaDon,
  timKhach,
  selectKhach,
  submitMoHoaDon,
  openDrawer,
  setDiscount,
  recalcTotal,
  themMon,
  xoaMon,
  thanhToan,
  huyHoaDon,
  printReceiptModal,
} from './modules/pos.js';
import { loadMenu, renderMenu, openMonForm, luuMon } from './modules/menu.js';
import {
  loadDatBan,
  capNhatDB,
  openDatBanForm,
  submitDatBan,
  locNam,
  loadHoaDon,
  loadKhachHang,
  openKhForm,
  submitKh,
  loadKho,
  nhapKho,
  loadBaoCao,
} from './modules/operations.js';

const LOADERS = {
  dashboard: loadDashboard,
  ban: loadBan,
  thucdon: loadMenu,
  datban: loadDatBan,
  hoadon: loadHoaDon,
  khachhang: loadKhachHang,
  kho: loadKho,
  baocao: loadBaoCao,
};

const PAGE_TITLES = {
  dashboard: { title: 'Tổng quan vận hành', subtitle: 'Báo cáo chỉ số kinh doanh & giám sát hoạt động hôm nay' },
  ban: { title: 'Sơ đồ bàn & Gọi món', subtitle: 'Theo dõi tình trạng bàn, mở hóa đơn và gọi món thời gian thực' },
  thucdon: { title: 'Quản lý thực đơn', subtitle: 'Danh sách các món ăn, danh mục và quản lý giá niêm yết' },
  datban: { title: 'Lịch đặt bàn', subtitle: 'Theo dõi khách đặt chỗ trước, xác nhận và tiếp đón' },
  hoadon: { title: 'Lịch sử hóa đơn', subtitle: 'Tra cứu, lọc dữ liệu bán hàng và kiểm tra chi tiết thanh toán' },
  khachhang: { title: 'Khách hàng thân thiết', subtitle: 'Hồ sơ thành viên, thứ hạng tích điểm và lịch sử chi tiêu' },
  kho: { title: 'Kho nguyên liệu', subtitle: 'Tồn kho nguyên vật liệu và quản lý tự động trừ kho theo công thức' },
  baocao: { title: 'Báo cáo doanh thu', subtitle: 'Phân tích doanh thu định kỳ theo tháng từ SQL Server' },
};

export function navigateTo(pageId) {
  if (!LOADERS[pageId]) pageId = 'dashboard';

  if (window.location.hash !== '#' + pageId) {
    history.replaceState(null, '', '#' + pageId);
  }

  $$('.nav-item').forEach((btn) => btn.classList.toggle('active', btn.dataset.page === pageId));
  $$('.page').forEach((sec) => sec.classList.toggle('active', sec.id === 'page-' + pageId));

  const info = PAGE_TITLES[pageId] || { title: 'Nhà hàng Sen Vàng', subtitle: 'Hệ thống quản lý' };
  const curView = $('#current-view-name');
  if (curView) curView.textContent = info.title;

  const sidebar = $('#sidebar');
  if (sidebar) sidebar.classList.remove('mobile-open');

  if (LOADERS[pageId]) {
    LOADERS[pageId]();
  }

  if (window.anime) {
    window.anime({
      targets: `#page-${pageId} .page-header, #page-${pageId} .card, #page-${pageId} .kpi-card`,
      translateY: [20, 0],
      opacity: [0, 1],
      duration: 480,
      delay: window.anime.stagger(40),
      easing: 'easeOutQuint',
    });
  }
}

function setupDelegatedEvents() {
  // Delegated click handler for all dynamic UI elements (zero inline handlers with database data)
  document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    switch (action) {
      case 'set-zone':
        setZone(actionEl.dataset.zone);
        break;
      case 'click-ban':
        clickBan(Number(actionEl.dataset.maBan));
        break;
      case 'close-modal':
        closeModal();
        break;
      case 'submit-mo-hoadon':
        submitMoHoaDon(Number(actionEl.dataset.maBan));
        break;
      case 'select-khach':
        selectKhach(Number(actionEl.dataset.maKh));
        break;
      case 'them-mon':
        themMon();
        break;
      case 'xoa-mon':
        xoaMon(Number(actionEl.dataset.maMon));
        break;
      case 'print-receipt':
        printReceiptModal();
        break;
      case 'window-print':
        window.print();
        break;
      case 'set-discount':
        setDiscount(Number(actionEl.dataset.discount));
        break;
      case 'thanh-toan':
        thanhToan();
        break;
      case 'huy-hoadon':
        huyHoaDon();
        break;
      case 'open-mon-form':
        openMonForm(Number(actionEl.dataset.maMon || 0));
        break;
      case 'luu-mon':
        luuMon(Number(actionEl.dataset.maMon || 0));
        break;
      case 'cap-nhat-db':
        capNhatDB(Number(actionEl.dataset.maDatBan), actionEl.dataset.trangThai);
        break;
      case 'submit-datban':
        submitDatBan();
        break;
      case 'open-drawer':
        openDrawer(Number(actionEl.dataset.maHd));
        break;
      case 'submit-kh':
        submitKh();
        break;
      case 'nhap-kho':
        nhapKho(Number(actionEl.dataset.maNl));
        break;
      default:
        break;
    }
  });

  // Delegated input/change handlers for modal and drawer inputs
  document.addEventListener('input', (e) => {
    if (e.target.id === 'm-kh') {
      timKhach();
    } else if (e.target.id === 'd-gg') {
      recalcTotal();
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'd-gg') {
      recalcTotal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeDrawer();
    }
  });
}

function init() {
  startClock();
  initAmbientCanvas();
  initCustomCursor();
  initCardTilt();
  setupDelegatedEvents();

  $$('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.page);
    });
  });

  const toggleBtn = $('#mobile-menu-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      $('#sidebar')?.classList.toggle('mobile-open');
    });
  }

  const modalBackdrop = $('#modal-backdrop');
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target.id === 'modal-backdrop') closeModal();
    });
  }

  const drawerBackdrop = $('#drawer-backdrop');
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', closeDrawer);
  }

  const refreshBtn = $('#btn-global-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      const activePage = $('.page.active')?.id?.replace('page-', '') || 'dashboard';
      if (LOADERS[activePage]) {
        if (window.anime) {
          window.anime({
            targets: refreshBtn.querySelector('.icon'),
            rotate: '+=360',
            duration: 500,
            easing: 'easeOutQuint',
          });
        }
        LOADERS[activePage]();
      }
    });
  }

  // Expose window.app for static HTML controls & backwards compatibility
  window.app = {
    navigateTo,
    loadDashboard,
    setZone,
    clickBan,
    openMoHoaDon,
    timKhach,
    selectKhach,
    submitMoHoaDon,
    openDrawer,
    closeDrawer,
    setDiscount,
    recalcTotal,
    themMon,
    xoaMon,
    thanhToan,
    huyHoaDon,
    printReceiptModal,
    loadMenu,
    renderMenu,
    openMonForm,
    luuMon,
    loadDatBan,
    capNhatDB,
    openDatBanForm,
    submitDatBan,
    locNam,
    loadHoaDon,
    loadKhachHang,
    openKhForm,
    submitKh,
    loadKho,
    nhapKho,
    loadBaoCao,
    openModal,
    closeModal,
  };

  window.addEventListener('hashchange', () => {
    const p = window.location.hash.slice(1);
    if (p.startsWith('hd-')) {
      const id = p.slice(3);
      navigateTo('ban');
      setTimeout(() => openDrawer(id), 150);
    } else if (p && LOADERS[p]) {
      navigateTo(p);
    }
  });

  const initialHash = window.location.hash.slice(1);
  if (initialHash.startsWith('hd-')) {
    const id = initialHash.slice(3);
    navigateTo('ban');
    setTimeout(() => openDrawer(id), 300);
  } else if (initialHash && LOADERS[initialHash]) {
    navigateTo(initialHash);
  } else {
    loadDashboard();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
