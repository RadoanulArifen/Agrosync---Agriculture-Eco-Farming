'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Leaf,
  Mail,
  ArrowRight,
  ChevronLeft,
  ShieldCheck,
  Rocket,
  RotateCcw,
  Upload,
  X,
  Lock,
  Eye,
  EyeOff,
  Phone,
} from 'lucide-react';
import { authService, DEMO_CREDENTIALS } from '@/services';
import type { BdLocationOption } from '@/services/bdLocations';
import { getDistrictsByDivision, getUpazilasByDistrictId } from '@/services/bdLocations';
import { DASHBOARD_ROUTES } from '@/constants';
import type { ManagedUserRole } from '@/types';

type Step = 'login' | 'register' | 'registerSuccess' | 'success';
type DashboardAccessRole = Exclude<ManagedUserRole, 'farmer'>;

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

const ROLE_OPTIONS: { value: DashboardAccessRole; label: string; subtitle: string }[] = [
  { value: 'admin', label: 'Admin', subtitle: 'Platform control and audit access' },
  { value: 'officer', label: 'Officer', subtitle: 'Regional advisory and case response' },
  { value: 'vendor', label: 'Vendor', subtitle: 'Product and order management' },
  { value: 'company', label: 'Company', subtitle: 'Buyer and procurement dashboard' },
];

const emptyRegisterForm = {
  name: '',
  nameBn: '',
  email: '',
  password: '',
  phone: '',
  division: '',
  district: '',
  upazila: '',
  designation: '',
  accessLabel: '',
  specialtyTags: '',
  regionDistricts: '',
  deliveryDistricts: '',
  cropInterests: '',
  registrationNo: '',
  companyName: '',
};

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const initialRole = searchParams?.get('role');
  const [step, setStep] = useState<Step>('login');
  const [selectedRole, setSelectedRole] = useState<DashboardAccessRole>(
    initialRole === 'officer' || initialRole === 'vendor' || initialRole === 'company' ? initialRole : 'admin',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
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
  const isOfficerFlow = selectedRole === 'officer';

  const roleConfig = useMemo(
    () => ROLE_OPTIONS.find((role) => role.value === selectedRole) || ROLE_OPTIONS[0],
    [selectedRole],
  );

  const setRegisterField = (key: keyof typeof emptyRegisterForm, value: string) => {
    setRegisterForm((prev) => ({ ...prev, [key]: value }));
    setError('');
    setInfo('');
  };

  const handleDivisionChange = async (division: string) => {
    setRegisterForm((prev) => ({
      ...prev,
      division,
      district: '',
      upazila: '',
    }));
    setDistricts([]);
    setUpazilas([]);
    setSelectedDistrictId('');
    setLocationError({ districts: '', upazilas: '' });
    setError('');
    setInfo('');

    if (!division) {
      return;
    }

    setLocationLoading((prev) => ({ ...prev, districts: true }));

    try {
      const districtOptions = await getDistrictsByDivision(division);
      setDistricts(districtOptions);
    } catch (locationLoadError) {
      console.error('Failed to load districts', locationLoadError);
      setLocationError((prev) => ({ ...prev, districts: 'District list could not be loaded. You can type it manually.' }));
    } finally {
      setLocationLoading((prev) => ({ ...prev, districts: false }));
    }
  };

  const handleDistrictChange = async (districtId: string) => {
    const district = districts.find((item) => item.id === districtId);

    setSelectedDistrictId(districtId);
    setRegisterForm((prev) => ({
      ...prev,
      district: district?.name || '',
      upazila: '',
    }));
    setUpazilas([]);
    setLocationError((prev) => ({ ...prev, upazilas: '' }));
    setError('');
    setInfo('');

    if (!districtId) {
      return;
    }

    setLocationLoading((prev) => ({ ...prev, upazilas: true }));

    try {
      const upazilaOptions = await getUpazilasByDistrictId(districtId);
      setUpazilas(upazilaOptions);
    } catch (locationLoadError) {
      console.error('Failed to load upazilas', locationLoadError);
      setLocationError((prev) => ({ ...prev, upazilas: 'Upazila list could not be loaded. You can type it manually.' }));
    } finally {
      setLocationLoading((prev) => ({ ...prev, upazilas: false }));
    }
  };

  const handleQuickDemoAccess = async (role: DashboardAccessRole) => {
    setSelectedRole(role);
    setLoading(true);
    setError('');
    setInfo('');
    const result = await authService.quickDemoLogin(role);
    setLoading(false);

    if (result.success && result.role) {
      window.location.href = DASHBOARD_ROUTES[result.role];
      return;
    }

    setError('Quick demo access failed. Please try again.');
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
      document.getElementById(`dashboard-registration-otp-${idx + 2}`)?.focus();
    }
  };

  const handleRegistrationOTPKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (event.key === 'Backspace' && !registrationOtp[idx] && idx > 0) {
      document.getElementById(`dashboard-registration-otp-${idx}`)?.focus();
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
      setInfo('');
    };
    reader.readAsDataURL(file);
  };

  const clearProfileImage = () => {
    setProfilePreview('');
    setError('');
    setInfo('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password.trim()) {
      setError('Enter your password.');
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');

    const result = await authService.adminLogin(email, password, selectedRole);
    setLoading(false);

    if (!result.success || !result.role) {
      setError(result.message || `Invalid ${roleConfig.label.toLowerCase()} email or password.`);
      return;
    }

    setStep('success');
    setTimeout(() => {
      window.location.href = DASHBOARD_ROUTES[result.role as DashboardAccessRole];
    }, 1200);
  };

  const handleSendRegistrationOTP = async () => {
    if (!registerForm.email.includes('@')) {
      setError('Enter a valid registration email address.');
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');
    setRegistrationOtpVerified(false);
    setRegistrationOtpToken('');

    const result = await authService.sendOTP(
      registerForm.email,
      selectedRole,
      'registration',
      registerForm.name || registerForm.nameBn || roleConfig.label,
    );

    setLoading(false);

    if (result.success) {
      setInfo(result.message || `OTP sent to ${registerForm.email}.`);
      setRegistrationOtpToken(result.otpToken || '');
      return;
    }

    setError(result.message || 'Unable to send registration OTP.');
  };

  const handleVerifyRegistrationOTP = async () => {
    if (!registerForm.email.includes('@')) {
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

    const result = await authService.verifyOTP(registerForm.email, code, selectedRole, 'registration');

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    if (!registerForm.email.includes('@')) {
      setLoading(false);
      setError('Enter a valid email address.');
      return;
    }

    if (!registerForm.name.trim() || !registerForm.phone.trim() || !registerForm.password.trim()) {
      setLoading(false);
      setError(`Please fill in all required ${roleConfig.label.toLowerCase()} information.`);
      return;
    }

    if (!registrationOtpVerified || !registrationOtpToken) {
      setLoading(false);
      setError('Verify the OTP sent to your registration email before submitting.');
      return;
    }

    const result = await authService.registerRoleUser({
      role: selectedRole,
      name: registerForm.name,
      nameBn: registerForm.nameBn,
      email: registerForm.email,
      phone: registerForm.phone,
      password: registerForm.password,
      division: registerForm.division,
      district: registerForm.district,
      upazila: registerForm.upazila,
      designation: registerForm.designation,
      accessLabel: registerForm.accessLabel || roleConfig.subtitle,
      specialtyTags: registerForm.specialtyTags.split(',').map((item) => item.trim()).filter(Boolean),
      regionDistricts: registerForm.regionDistricts.split(',').map((item) => item.trim()).filter(Boolean),
      deliveryDistricts: registerForm.deliveryDistricts.split(',').map((item) => item.trim()).filter(Boolean),
      cropInterests: registerForm.cropInterests.split(',').map((item) => item.trim()).filter(Boolean),
      registrationNo: registerForm.registrationNo,
      companyName: registerForm.companyName || registerForm.name,
      avatar: profilePreview || undefined,
      registrationOtpToken,
    });

    setLoading(false);

    if (!result.success || !result.user) {
      setError(result.message || 'Registration failed. Please try again.');
      return;
    }

    setRegisteredEmail(registerForm.email);
    setEmail(registerForm.email);
    setPassword('');
    setRegistrationOtp(['', '', '', '', '', '']);
    setRegistrationOtpVerified(false);
    setRegistrationOtpToken('');
    setRegisterForm(emptyRegisterForm);
    setDistricts([]);
    setUpazilas([]);
    setSelectedDistrictId('');
    setProfilePreview('');
    setStep('registerSuccess');
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div
        className="hidden lg:flex flex-col justify-between p-8 xl:p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d2818 0%, #1a4731 50%, #2d6a4f 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80)", backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
        <div className="relative">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-harvest rounded-full flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">Agricul<span className="text-harvest">MS</span></span>
          </Link>
        </div>
        <div className="relative">
          <h2 className="text-4xl font-bold text-white mb-4">Dashboard Access</h2>
          <p className="text-white/60 text-lg leading-relaxed mb-8">
            Admin, vendor, ar company dashboard access farmer portal-er moto same login ar registration flow diye manage korun. Officer access ager advisory flow-er motoi thakbe.
          </p>
          <div className="space-y-4">
            {ROLE_OPTIONS.map((role) => (
              <div
                key={role.value}
                className={`rounded-2xl border p-4 transition-colors ${selectedRole === role.value ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10'}`}
              >
                <div className="text-white font-semibold">{role.label}</div>
                <div className="text-white/60 text-sm">{role.subtitle}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-white/30 text-sm">© 2026 AgriculMS</div>
      </div>

      <div className="flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8 bg-white">
        <div className="w-full max-w-lg">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-forest rounded-full flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="text-forest font-bold text-lg">Agricul<span className="text-harvest">MS</span></span>
          </div>

          {step === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="mb-6">
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700 mb-2 block">Select Role</span>
                  <select
                    value={selectedRole}
                    onChange={(e) => {
                      setSelectedRole(e.target.value as DashboardAccessRole);
                      setError('');
                      setInfo('');
                    }}
                    className="input-field"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mb-6 rounded-2xl border border-forest/10 bg-forest/5 px-4 py-3">
                <div className="text-sm font-semibold text-forest">{roleConfig.label} Access</div>
                <div className="text-xs text-gray-500 mt-1">{roleConfig.subtitle}</div>
              </div>

              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{roleConfig.label} Login</h1>
                <p className="text-gray-500">
                  {isOfficerFlow
                    ? 'Officer advisory dashboard access আগের মতোই email আর password দিয়ে হবে.'
                    : `Use your email and password to access the ${roleConfig.label.toLowerCase()} dashboard.`}
                </p>
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
                    placeholder={`${selectedRole}@email.com`}
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
                    <div className="text-sm font-semibold text-gray-800">Quick Demo {roleConfig.label}</div>
                    <div className="text-xs text-gray-500">{DEMO_CREDENTIALS[selectedRole].email}</div>
                  </div>
                  <button type="button" onClick={handleResetDemoData} className="text-xs font-semibold text-forest hover:text-harvest flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Demo
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => handleQuickDemoAccess(role.value)}
                      disabled={loading}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-left hover:border-forest/30 hover:bg-forest/5 transition-colors disabled:opacity-60"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{role.label}</div>
                          <div className="text-[11px] text-gray-400">{DEMO_CREDENTIALS[role.value].email}</div>
                        </div>
                        <Rocket className="w-4 h-4 text-forest" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              {info && <p className="text-green-600 text-sm mb-4">{info}</p>}

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? 'Logging in...' : <>Login <ArrowRight className="w-4 h-4" /></>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('');
                  setInfo('');
                  setStep('register');
                }}
                className="btn-outline w-full mt-3 flex items-center justify-center gap-2"
              >
                {roleConfig.label} Registration
              </button>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-blue-700 text-sm flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {isOfficerFlow
                    ? 'Officer login direct email + password দিয়েই হবে. Officer registration OTP verify করেই submit করা যাবে.'
                    : `${roleConfig.label} login এখন direct email + password দিয়ে হবে. Registration-এর সময় email OTP verify করতে হবে.`}
                </p>
              </div>

              <div className="mt-8 text-center">
                <p className="text-gray-400 text-sm">
                  Need farmer login?{' '}
                  <Link href="/auth/farmer-login" className="text-forest font-semibold hover:text-harvest">
                    Farmer Login
                  </Link>
                </p>
              </div>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleRegister}>
              <button
                type="button"
                onClick={() => setStep('login')}
                className="flex items-center gap-1 text-gray-400 text-sm mb-6 hover:text-forest"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <div className="mb-6">
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700 mb-2 block">Select Role</span>
                  <select
                    value={selectedRole}
                    onChange={(e) => {
                      setSelectedRole(e.target.value as DashboardAccessRole);
                      setError('');
                      setInfo('');
                    }}
                    className="input-field"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{roleConfig.label} Registration</h1>
                <p className="text-gray-500">
                  {isOfficerFlow
                    ? 'Officer registration flow আগের মতোই থাকবে, শুধু district/division/upazila selector same system-এ দেখাবে.'
                    : `Fill in the ${roleConfig.label.toLowerCase()} details to create a new account request.`}
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Name (BN)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="নাম"
                      value={registerForm.nameBn}
                      onChange={(e) => setRegisterField('nameBn', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Name (EN)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder={`${roleConfig.label} name`}
                      value={registerForm.name}
                      onChange={(e) => setRegisterField('name', e.target.value)}
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
                        placeholder={`${selectedRole}@email.com`}
                        value={registerForm.email}
                        onChange={(e) => {
                          setRegisterField('email', e.target.value);
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
                        id={`dashboard-registration-otp-${i + 1}`}
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
                      value={registerForm.password}
                      onChange={(e) => setRegisterField('password', e.target.value)}
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
                      value={registerForm.phone}
                      onChange={(e) => setRegisterField('phone', e.target.value)}
                      maxLength={11}
                      required
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Division</label>
                    <select
                      className="input-field"
                      value={registerForm.division}
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
                        disabled={!registerForm.division || locationLoading.districts}
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
                        value={registerForm.district}
                        onChange={(e) => setRegisterField('district', e.target.value)}
                        disabled={!registerForm.division}
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
                        value={registerForm.upazila}
                        onChange={(e) => setRegisterField('upazila', e.target.value)}
                        disabled={!registerForm.district || locationLoading.upazilas}
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
                        value={registerForm.upazila}
                        onChange={(e) => setRegisterField('upazila', e.target.value)}
                        disabled={!registerForm.district}
                        required
                      />
                    )}
                    {locationError.upazilas && <p className="mt-2 text-xs text-amber-600">{locationError.upazilas}</p>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Designation / Title</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder={`${roleConfig.label} title`}
                      value={registerForm.designation}
                      onChange={(e) => setRegisterField('designation', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Access Label</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder={roleConfig.subtitle}
                      value={registerForm.accessLabel}
                      onChange={(e) => setRegisterField('accessLabel', e.target.value)}
                    />
                  </div>
                </div>

                {(selectedRole === 'vendor' || selectedRole === 'company') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Company name"
                      value={registerForm.companyName}
                      onChange={(e) => setRegisterField('companyName', e.target.value)}
                      required
                    />
                  </div>
                )}

                {selectedRole === 'company' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Registration No</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Registration number"
                        value={registerForm.registrationNo}
                        onChange={(e) => setRegisterField('registrationNo', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Crop Interests</label>
                      <textarea
                        className="input-field resize-none"
                        rows={3}
                        placeholder="e.g. Rice, Potato, Mango"
                        value={registerForm.cropInterests}
                        onChange={(e) => setRegisterField('cropInterests', e.target.value)}
                      />
                    </div>
                  </>
                )}

                {selectedRole === 'officer' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Specialties</label>
                      <textarea
                        className="input-field resize-none"
                        rows={3}
                        placeholder="e.g. Rice Disease, Pest Control"
                        value={registerForm.specialtyTags}
                        onChange={(e) => setRegisterField('specialtyTags', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Coverage Districts</label>
                      <textarea
                        className="input-field resize-none"
                        rows={3}
                        placeholder="e.g. Mymensingh, Tangail, Jamalpur"
                        value={registerForm.regionDistricts}
                        onChange={(e) => setRegisterField('regionDistricts', e.target.value)}
                      />
                    </div>
                  </>
                )}

                {selectedRole === 'vendor' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Delivery Districts</label>
                    <textarea
                      className="input-field resize-none"
                      rows={3}
                      placeholder="e.g. Dhaka, Mymensingh, Rajshahi"
                      value={registerForm.deliveryDistricts}
                      onChange={(e) => setRegisterField('deliveryDistricts', e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-60">
                  {loading ? 'Submitting...' : 'Submit Registration'}
                </button>
                <button type="button" onClick={() => setStep('login')} className="btn-outline px-4 py-3">
                  Cancel
                </button>
              </div>

              {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
              {info && <p className="text-green-600 text-sm mt-4">{info}</p>}
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
              <p className="text-gray-500 mb-6">{roleConfig.label} details have been captured successfully. You can now log in with <strong>{registeredEmail || email}</strong>.</p>
              <button type="button" onClick={() => setStep('login')} className="btn-primary">
                Back to {roleConfig.label} Login
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

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <AdminLoginContent />
    </Suspense>
  );
}
