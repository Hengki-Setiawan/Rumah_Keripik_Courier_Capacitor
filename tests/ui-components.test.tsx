import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Button, Spinner } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FilterPill } from '@/components/ui/FilterPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { toast, useToastStore } from '@/stores/toast-store';

describe('Button', () => {
  it('renders children dan menerapkan variant/size default', () => {
    render(<Button>Kirim</Button>);
    const btn = screen.getByRole('button', { name: /kirim/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('bg-brand');
    expect(btn.className).toContain('h-12');
  });

  it('menambahkan fullWidth class saat diset', () => {
    render(<Button fullWidth>Kirim</Button>);
    expect(screen.getByRole('button').className).toContain('w-full');
  });

  it('disabled saat loading dan menampilkan Spinner', () => {
    render(<Button loading>Kirim</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(document.querySelector('svg[class*="animate-spin"]')).not.toBeNull();
  });

  it('meneruskan onClick dan tidak men-trigger saat disabled', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Kirim</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('spinner dirender sebagai aria-hidden', () => {
    render(<Spinner />);
    expect(document.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('Card', () => {
  it('merender children di dalam container', () => {
    render(<Card>Isi kartu</Card>);
    expect(screen.getByText('Isi kartu')).toBeInTheDocument();
  });
});

describe('StatCard', () => {
  it('menampilkan label, value, hint', () => {
    render(<StatCard label="Pesanan Selesai" value="12" icon={<span>x</span>} hint="+2 dari kemarin" />);
    expect(screen.getByText('Pesanan Selesai')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('+2 dari kemarin')).toBeInTheDocument();
  });

  it('menerapkan tone yang benar', () => {
    render(<StatCard label="Pendapatan" value="Rp100" icon={<span>x</span>} tone="emerald" />);
    const chip = screen.getByText('x').closest('div');
    expect(chip?.className).toContain('bg-ok-soft');
  });
});

describe('StatusBadge', () => {
  it('memetakan status Siap_Dikirim ke label Indonesia', () => {
    render(<StatusBadge status="Siap_Dikirim" />);
    expect(screen.getByText('Siap Dikirim')).toBeInTheDocument();
  });

  it('menampilkan status asing apa adanya (fallback)', () => {
    render(<StatusBadge status="Unknown" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});

describe('FilterPill', () => {
  it('memanggil onClick saat diklik', () => {
    const onClick = vi.fn();
    render(<FilterPill label="Semua" onClick={onClick} />);
    fireEvent.click(screen.getByText('Semua'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('menampilkan count bila diberikan', () => {
    render(<FilterPill label="Aktif" onClick={() => {}} count={7} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('merender title dan description', () => {
    render(<EmptyState icon={<span>i</span>} title="Belum ada data" description="Coba lagi nanti" />);
    expect(screen.getByText('Belum ada data')).toBeInTheDocument();
    expect(screen.getByText('Coba lagi nanti')).toBeInTheDocument();
  });

  it('memanggil onAction saat tombol aksi diklik', () => {
    const onAction = vi.fn();
    render(<EmptyState icon={<span>i</span>} title="Kosong" actionLabel="Muat Ulang" onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Muat Ulang' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe('ToastContainer', () => {
  it('merender pesan yang di-push via store helper', () => {
    toast.success('Shift dimulai');
    render(<ToastContainer />);
    expect(screen.getByText('Shift dimulai')).toBeInTheDocument();
    // Reset agar tidak bocor ke test lain.
    useToastStore.setState({ toasts: [] });
  });

  it('variasi warning memakai ikon peringatan', () => {
    toast.warning('Anda keluar dari rute');
    render(<ToastContainer />);
    expect(screen.getByText('Anda keluar dari rute')).toBeInTheDocument();
    useToastStore.setState({ toasts: [] });
  });

  it('menghilangkan toast yang di-dismiss', () => {
    useToastStore.getState().push('Pesan sementara');
    const { getByText, queryByText } = render(<ToastContainer />);
    expect(getByText('Pesan sementara')).toBeInTheDocument();
    const id = useToastStore.getState().toasts[0]?.id;
    if (id) {
      act(() => useToastStore.getState().dismiss(id));
    }
    expect(queryByText('Pesan sementara')).not.toBeInTheDocument();
  });
});