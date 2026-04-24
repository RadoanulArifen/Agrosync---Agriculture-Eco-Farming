'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Leaf, Phone, ArrowRight, ChevronLeft, ShieldCheck, Mail, Rocket, RotateCcw, Upload, X, Lock, Eye, EyeOff } from 'lucide-react';
import { authService, DEMO_CREDENTIALS, farmerService } from '@/services';
import type { BdLocationOption } from '@/services/bdLocations';
import { getDistrictsByDivision, getUpazilasByDistrictId } from '@/services/bdLocations';

type Step = 'email' | 'register' | 'registerSuccess' | 'success';

const DIVISIONS = [
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
];

export default function FarmerLoginPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registrationForm, setRegistrationForm] = useState({
    nameBn: '',
    nameEn: '',
    email: '',
    password: '',
    phone: '',
    nid: '',
    division: '',
    district: '',
    upazila: '',
    landSize: '',
    cropTypes: '',
    bkashNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [profilePreview, setProfilePreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registrationOtp, setRegistrationOtp] = useState(['', '', '', '', '', '']);
  const [registrationOtpVerified, setRegistrationOtpVerified] = useState(false);
  const [registrationOtpToken, setRegistrationOtpToken] = useState('');
  const [districts, setDistricts] = useState<BdLocationOption[]>([]);
  const [upazilas, setUpazilas] = useState<BdLocationOption[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [locationLoading, setLocationLoading] = useState({ districts: false, upazilas: false });
  const [locationError, setLocationError] = useState({ districts: '', upazilas: '' });

  const updateRegistrationForm = (key: keyof typeof registrationForm, value: string) => {
    setRegistrationForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDivisionChange = async (division: string) => {
    setRegistrationForm((prev) => ({
      ...prev,
      division,
      district: '',
      upazila: '',
    }));
    setDistricts([]);
    setUpazilas([]);
    setSelectedDistrictId('');
    setLocationError({ districts: '', upazilas: '' });

    if (!division) {
      return;
    }

    setLocationLoading((prev) => ({ ...prev, districts: true }));

    try {
      const districtOptions = await getDistrictsByDivision(division);
      setDistricts(districtOptions);
    } catch (error) {
      console.error('Failed to load districts', error);
      setLocationError((prev) => ({ ...prev, districts: 'District list could not be loaded. You can type it manually.' }));
    } finally {
      setLocationLoading((prev) => ({ ...prev, districts: false }));
    }
  };

  const handleDistrictChange = async (districtId: string) => {
    const district = districts.find((item) => item.id === districtId);

    setSelectedDistrictId(districtId);
    setRegistrationForm((prev) => ({
      ...prev,
      district: district?.name || '',
      upazila: '',
    }));
    setUpazilas([]);
    setLocationError((prev) => ({ ...prev, upazilas: '' }));

    if (!districtId) {
      return;
    }

    setLocationLoading((prev) => ({ ...prev, upazilas: true }));

    try {
      const upazilaOptions = await getUpazilasByDistrictId(districtId);
      setUpazilas(upazilaOptions);
    } catch (error) {
      console.error('Failed to load upazilas', error);
      setLocationError((prev) => ({ ...prev, upazilas: 'Upazila list could not be loaded. You can type it manually.' }));
    } finally {
      setLocationLoading((prev) => ({ ...prev, upazilas: false }));
    }
  };

  const handleQuickDemoFarmer = async () => {
    setLoading(true);
    setError('');
    setInfo('');
    const result = await authService.quickDemoLogin('farmer');
    setLoading(false);

    if (result.success) {
      window.location.href = '/dashboard/farmer';
      return;
    }

    setError('Quick demo farmer login failed. Please try again.');
  };

  const handleResetDemoData = () => {
    authService.resetDemoData();
    setError('');
    setInfo('');
    setRegisteredEmail('');
  };

  const handleRegistrationOTPChange = (val: string, idx: number) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...registrationOtp];
    next[idx] = val.slice(-1);
    setRegistrationOtp(next);
    setRegistrationOtpVerified(false);
    if (val && idx < 5) {
      document.getElementById(`registration-otp-${idx + 2}`)?.focus();
    }
  };

  const handleRegistrationOTPKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (event.key === 'Backspace' && !registrationOtp[idx] && idx > 0) {
      document.getElementById(`registration-otp-${idx}`)?.focus();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setError('Enter a valid email address'); return; }
    if (!password.trim()) { setError('Enter your password.'); return; }
    setLoading(true); setError(''); setInfo('');
    const res = await authService.adminLogin(email, password, 'farmer');
    setLoading(false);
    if (res.success) {
      setStep('success');
      setTimeout(() => { window.location.href = '/dashboard/farmer'; }, 1200);
    } else {
      setError(res.message || 'Invalid farmer email or password.');
    }
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = typeof reader.result === 'string' ? reader.result : '';
      setProfilePreview(imageUrl);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const clearProfileImage = () => {
    setProfilePreview('');
  };

  const handleSendRegistrationOTP = async () => {
    if (!registrationForm.email.includes('@')) {
      setError('Enter a valid registration email address.');
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');
    setRegistrationOtpVerified(false);
    setRegistrationOtpToken('');

    const result = await authService.sendOTP(
      registrationForm.email,
      'farmer',
      'registration',
      registrationForm.nameEn || registrationForm.nameBn || 'Farmer',
    );

    setLoading(false);

    if (result.success) {
      setInfo(result.message || `OTP sent to ${registrationForm.email}.`);
      setRegistrationOtpToken(result.otpToken || '');
      return;
    }

    setError(result.message || 'Unable to send registration OTP.');
  };

  const handleVerifyRegistrationOTP = async () => {
    if (!registrationForm.email.includes('@')) {
      setError('Enter a valid registration email address.');
      return;
    }

    const code = registrationOtp.join('');
    if (code.length < 6) {
      setError('Enter the 6-digit registration OTP.');
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');

    const result = await authService.verifyOTP(registrationForm.email, code, 'farmer', 'registration');

    setLoading(false);

    if (result.success && result.verifiedToken) {
      setRegistrationOtpVerified(true);
      setRegistrationOtpToken(result.verifiedToken);
      setInfo('Registration OTP verified successfully.');
      return;
    }

    setRegistrationOtpVerified(false);
    setError('Invalid or expired registration OTP. Please request a new one.');
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    if (!registrationForm.email.includes('@')) {
      setLoading(false);
      setError('Enter a valid email address.');
      return;
    }

    if (!registrationForm.nameEn.trim() || !registrationForm.phone.trim() || !registrationForm.nid.trim() || !registrationForm.password.trim()) {
      setLoading(false);
      setError('Please fill in all required farmer information.');
      return;
    }

    if (!registrationOtpVerified || !registrationOtpToken) {
      setLoading(false);
      setError('Verify the OTP sent to your registration email before submitting.');
      return;
    }

    const result = await farmerService.registerFarmer({
      name: registrationForm.nameEn,
      nameBn: registrationForm.nameBn,
      email: registrationForm.email,
      password: registrationForm.password,
      phone: registrationForm.phone,
      nidHash: `nid_${registrationForm.nid}`,
      division: registrationForm.division,
      district: registrationForm.district,
      upazila: registrationForm.upazila,
      landAcres: Number.parseFloat(registrationForm.landSize) || 0,
      cropTypes: registrationForm.cropTypes.split(',').map((crop) => crop.trim()).filter(Boolean),
      bkashAccount: registrationForm.bkashNumber,
      avatar: profilePreview || undefined,
      registrationOtpToken,
    });

    setLoading(false);

    if (result.success) {
      setRegisteredEmail(registrationForm.email);
      setEmail(registrationForm.email);
      setPassword('');
      setRegistrationOtp(['', '', '', '', '', '']);
      setRegistrationOtpVerified(false);
      setRegistrationOtpToken('');
      setProfilePreview('');
      setStep('registerSuccess');
    } else {
      setError(result.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left – decorative panel */}
      <div className="hidden lg:flex flex-col justify-between p-8 xl:p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d2818 0%, #1a4731 50%, #2d6a4f 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80)", backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="relative">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-harvest rounded-full flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">Agricul<span className="text-harvest">MS</span></span>
          </Link>
        </div>
        <div className="relative">
          <h2 className="text-4xl font-bold text-white mb-4">Farmer Portal</h2>
          <p className="text-white/60 text-lg leading-relaxed mb-8">
            Submit crop problems, browse marketplace, place orders, list crops for sale, view advisory history, and receive notifications.
          </p>
          <div className="space-y-4">
            {[
              'Submit crop problems and view advisory history',
              'Browse marketplace and place orders',
              'List crops for sale and receive notifications',
              'Cannot access officer dashboards, vendor management, or other farmers\' data',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-harvest rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/80 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-white/30 text-sm">© 2026 AgriculMS</div>
      </div>

      {/* Right – form panel */}
      <div className="flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8 bg-white">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-forest rounded-full flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="text-forest font-bold text-lg">Agricul<span className="text-harvest">MS</span></span>
          </div>

          {step === 'email' && (
            <form onSubmit={handleLogin}>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Farmer Login</h1>
                <p className="text-gray-500">Use your email and password to access the farmer dashboard.</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="farmer@email.com"
                    className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-xl pl-11 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Quick Demo Farmer</div>
                    <div className="text-xs text-gray-500">{DEMO_CREDENTIALS.farmer.email}</div>
                  </div>
                  <button type="button" onClick={handleResetDemoData} className="text-xs font-semibold text-forest hover:text-harvest flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Demo
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleQuickDemoFarmer}
                  disabled={loading}
                  className="w-full rounded-xl border border-forest/20 bg-white px-4 py-3 text-sm font-semibold text-forest hover:bg-forest/5 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Rocket className="w-4 h-4" />
                  Open Demo Farmer Dashboard
                </button>
              </div>

              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              {info && <p className="text-green-600 text-sm mb-4">{info}</p>}

              <button type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? 'Logging in...' : (<>Login <ArrowRight className="w-4 h-4" /></>)}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep('register');
                }}
                className="btn-outline w-full mt-3 flex items-center justify-center gap-2"
              >
                Farmer Registration
              </button>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-blue-700 text-sm flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  Farmer login এখন direct email + password দিয়ে হবে. Registration-এর সময় email OTP verify করতে হবে.
                </p>
              </div>

              <div className="mt-8 text-center">
                <p className="text-gray-400 text-sm">
                  Not a farmer?{' '}
                  <Link href="/auth/admin-login" className="text-forest font-semibold hover:text-harvest">
                    Officer / Admin Login
                  </Link>
                </p>
              </div>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleRegistrationSubmit}>
              <button
                type="button"
                onClick={() => setStep('email')}
                className="flex items-center gap-1 text-gray-400 text-sm mb-6 hover:text-forest"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Farmer Registration</h1>
                <p className="text-gray-500">Fill in the farmer details to create a new registration request</p>
              </div>

              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Name (BN)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="কৃষকের নাম"
                      value={registrationForm.nameBn}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, nameBn: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Name (EN)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Farmer name"
                      value={registrationForm.nameEn}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, nameEn: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <Mail className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                        placeholder="farmer@email.com"
                        value={registrationForm.email}
                        onChange={(e) => {
                          setRegistrationForm({ ...registrationForm, email: e.target.value });
                          setRegistrationOtpVerified(false);
                          setRegistrationOtpToken('');
                        }}
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendRegistrationOTP}
                      disabled={loading}
                      className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-white hover:bg-forest-light disabled:opacity-60"
                    >
                      {loading ? 'Sending...' : 'Send OTP'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">This email will receive the registration OTP through SMTP email.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <label className="block text-sm font-semibold text-gray-700">Registration OTP</label>
                    <button
                      type="button"
                      onClick={handleVerifyRegistrationOTP}
                      disabled={loading}
                      className="text-sm font-semibold text-forest hover:text-harvest disabled:opacity-60"
                    >
                      Verify OTP
                    </button>
                  </div>
                  <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1">
                    {registrationOtp.map((digit, i) => (
                      <input
                        key={i}
                        id={`registration-otp-${i + 1}`}
                        type="text"
                        inputMode="numeric"
                        value={digit}
                        onChange={(e) => handleRegistrationOTPChange(e.target.value, i)}
                        onKeyDown={(e) => handleRegistrationOTPKeyDown(e, i)}
                        className="h-12 w-12 sm:h-14 sm:w-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 transition-colors"
                        maxLength={1}
                      />
                    ))}
                  </div>
                  <p className={`mt-2 text-xs ${registrationOtpVerified ? 'text-green-600' : 'text-gray-400'}`}>
                    {registrationOtpVerified
                      ? 'Email OTP verified. You can submit the registration now.'
                      : 'Send OTP to your email, then enter the 6-digit code here and verify it.'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full border border-gray-200 rounded-xl pl-11 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                      placeholder="Create a password"
                      value={registrationForm.password}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Use this password when your farmer account is connected with backend authentication.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Image (Optional)</label>
                  <label className="input-field flex cursor-pointer items-center justify-between gap-3">
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                        <Upload className="w-5 h-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-base text-gray-700">
                          {profilePreview ? 'Image selected successfully' : 'Choose a profile image'}
                        </span>
                        <span className="block text-sm text-gray-400">Optional. JPG, PNG, or WebP supported.</span>
                      </span>
                    </span>
                    <span className="text-sm font-medium text-forest whitespace-nowrap">Browse</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageChange} />
                  </label>

                  {profilePreview && (
                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <img src={profilePreview} alt="Profile preview" className="h-14 w-14 rounded-xl object-cover border border-gray-200" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-700">Preview ready</div>
                        <div className="text-sm text-gray-400">Registration can continue with or without this image.</div>
                      </div>
                      <button type="button" onClick={clearProfileImage} className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700">
                        <X className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 text-sm">+880</span>
                      <div className="w-px h-4 bg-gray-200" />
                    </div>
                    <input
                      type="tel"
                      className="w-full border border-gray-200 rounded-xl pl-24 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                      placeholder="01XXXXXXXXX"
                      value={registrationForm.phone}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, phone: e.target.value })}
                      maxLength={11}
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">This mobile number will be used for future farmer login.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">NID</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter NID number"
                    value={registrationForm.nid}
                    onChange={(e) => setRegistrationForm({ ...registrationForm, nid: e.target.value })}
                    required
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Division</label>
                    <select
                      className="input-field"
                      value={registrationForm.division}
                      onChange={(e) => void handleDivisionChange(e.target.value)}
                      required
                    >
                      <option value="">Select division</option>
                      {DIVISIONS.map((division) => (
                        <option key={division} value={division}>{division}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">District</label>
                    {locationLoading.districts || districts.length > 0 ? (
                      <select
                        className="input-field"
                        value={selectedDistrictId}
                        onChange={(e) => void handleDistrictChange(e.target.value)}
                        disabled={!registrationForm.division || locationLoading.districts}
                        required
                      >
                        <option value="">
                          {locationLoading.districts ? 'Loading districts...' : 'Select district'}
                        </option>
                        {districts.map((district) => (
                          <option key={district.id} value={district.id}>{district.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="input-field"
                        placeholder="District"
                        value={registrationForm.district}
                        onChange={(e) => updateRegistrationForm('district', e.target.value)}
                        disabled={!registrationForm.division}
                        required
                      />
                    )}
                    {locationError.districts && <p className="mt-2 text-xs text-amber-600">{locationError.districts}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Upazila</label>
                    {locationLoading.upazilas || upazilas.length > 0 ? (
                      <select
                        className="input-field"
                        value={registrationForm.upazila}
                        onChange={(e) => updateRegistrationForm('upazila', e.target.value)}
                        disabled={!registrationForm.district || locationLoading.upazilas}
                        required
                      >
                        <option value="">
                          {locationLoading.upazilas ? 'Loading upazilas...' : 'Select upazila'}
                        </option>
                        {upazilas.map((upazila) => (
                          <option key={upazila.id} value={upazila.name}>{upazila.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Upazila"
                        value={registrationForm.upazila}
                        onChange={(e) => updateRegistrationForm('upazila', e.target.value)}
                        disabled={!registrationForm.district}
                        required
                      />
                    )}
                    {locationError.upazilas && <p className="mt-2 text-xs text-amber-600">{locationError.upazilas}</p>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Land Size</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. 3.5 acres"
                      value={registrationForm.landSize}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, landSize: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Info (bKash)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="01XXXXXXXXX"
                      value={registrationForm.bkashNumber}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, bkashNumber: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Crop Types</label>
                  <textarea
                    className="input-field resize-none"
                    rows={3}
                    placeholder="e.g. Rice, Wheat, Mustard"
                    value={registrationForm.cropTypes}
                    onChange={(e) => setRegistrationForm({ ...registrationForm, cropTypes: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-60">
                  {loading ? 'Submitting...' : 'Submit Registration'}
                </button>
                <button type="button" onClick={() => setStep('email')} className="btn-outline px-4 py-3">
                  Cancel
                </button>
              </div>

              {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
            </form>
          )}

          {step === 'registerSuccess' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted</h2>
              <p className="text-gray-500 mb-6">Farmer details have been captured successfully. You can now log in with <strong>{registeredEmail || email}</strong>.</p>
              <button type="button" onClick={() => setStep('email')} className="btn-primary">
                Back to Email Login
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Successful!</h2>
              <p className="text-gray-500">Redirecting to your dashboard...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
