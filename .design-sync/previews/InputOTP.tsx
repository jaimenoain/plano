import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator, Label } from 'plano';

const noop = () => {};

export const SixDigit = () => (
  <InputOTP maxLength={6} value="481627" onChange={noop}>
    <InputOTPGroup>
      <InputOTPSlot index={0} />
      <InputOTPSlot index={1} />
      <InputOTPSlot index={2} />
      <InputOTPSlot index={3} />
      <InputOTPSlot index={4} />
      <InputOTPSlot index={5} />
    </InputOTPGroup>
  </InputOTP>
);

export const Grouped = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <Label>Verification code</Label>
    <InputOTP maxLength={6} value="203" onChange={noop}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  </div>
);
