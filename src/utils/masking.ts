/**
 * Privacy protection utility for masking user sensitive data in Live Feeds and Leaderboards
 */

export function maskName(name: string): string {
  if (!name || typeof name !== 'string') return 'U***r';
  const clean = name.trim();
  if (clean.length === 0) return 'U***r';

  const parts = clean.split(/\s+/);
  return parts
    .map((part) => {
      if (part.length <= 1) return part;
      if (part.length === 2) return part[0] + '*';
      const middleStars = '*'.repeat(part.length - 2);
      return `${part[0]}${middleStars}${part[part.length - 1]}`;
    })
    .join(' ');
}

export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '09******00';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('251')) {
    digits = '0' + digits.slice(3);
  }
  if (!digits.startsWith('0')) {
    digits = '0' + digits;
  }
  if (digits.length < 8) return '09******00';

  const prefix = digits.slice(0, 2); // e.g. "09" or "07"
  const suffix = digits.slice(-2);   // last 2 digits e.g. "78"
  return `${prefix}******${suffix}`;
}

export function maskAmount(amount: number, currency: string = 'Birr'): string {
  const numStr = Math.round(Math.abs(amount)).toString();
  if (numStr.length <= 1) return `${numStr} ${currency}`;

  const firstDigit = numStr[0];
  const stars = '*'.repeat(numStr.length - 1);
  return `${firstDigit}${stars} ${currency}`;
}

export function maskBankName(bankOrMethod: string): string {
  if (!bankOrMethod) return 'C** Bank';
  const lower = bankOrMethod.toLowerCase().trim();

  if (lower.includes('telebirr')) {
    return 'T******r';
  }
  if (lower.includes('cbe birr') || lower === 'cbe_birr') {
    return 'C** Birr';
  }
  if (lower.includes('commercial bank') || lower.includes('cbe')) {
    return 'C******** Bank';
  }
  if (lower.includes('awash')) {
    return 'A**** Bank';
  }
  if (lower.includes('dashen')) {
    return 'D****n Bank';
  }
  if (lower.includes('abyssinia')) {
    return 'A*******a Bank';
  }
  if (lower.includes('oromia')) {
    return 'O****a Bank';
  }
  if (lower.includes('cooperative') || lower.includes('coop')) {
    return 'C*********e Bank';
  }
  if (lower.includes('bank_transfer') || lower.includes('bank transfer')) {
    return 'B**k Transfer';
  }

  // Fallback generic masking
  const words = bankOrMethod.split(/\s+/);
  return words
    .map((w) => {
      if (w.length <= 2) return w;
      return `${w[0]}${'*'.repeat(w.length - 2)}${w[w.length - 1]}`;
    })
    .join(' ');
}
