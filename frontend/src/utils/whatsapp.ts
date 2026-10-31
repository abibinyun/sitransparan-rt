interface WhatsAppOrderParams {
  phone: string;
  buyerName: string;
  buyerHouse: string;
  productTitle: string;
  price?: number;
}

export function generateWhatsAppOrderUrl(params: WhatsAppOrderParams): string {
  const rawPhone = params.phone.replace(/[^0-9]/g, '');
  if (!rawPhone || rawPhone.length < 8) return '';

  let normalized = rawPhone;
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.slice(1);
  } else if (!normalized.startsWith('62')) {
    normalized = '62' + normalized;
  }

  const priceText = params.price ? ` seharga Rp ${params.price.toLocaleString('id-ID')}` : '';
  const message = `Halo, saya ${params.buyerName} dari ${params.buyerHouse}. Saya berminat pesan *${params.productTitle}*${priceText}. Apakah masih tersedia?`;

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
