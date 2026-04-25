'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Leaf, Mail, ArrowRight, UserPlus, Rocket, RotateCcw, Upload, X, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { authService, DEMO_CREDENTIALS } from '@/services';
import type { BdLocationOption } from '@/services/bdLocations';
import { getDistrictsByDivision, getUpazilasByDistrictId } from '@/services/bdLocations';
import { DASHBOARD_ROUTES } from '@/constants';
import type { ManagedUserRole } from '@/types';

type AuthMode = 'login' | 'register' | 'registerSuccess' | 'success';
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
  phone: '',
  password: '',
  division: '',
  district: '',
  upazila: '',
  designation: '',
  accessLabel: '',
  specialtyTags: '',
  regionDistricts: '',
  deliveryDistricts: '',
  cropInterests: '',
  cropTypes: '',
  landAcres: '',
  bkashAccount: '',
  registrationNo: '',
  companyName: '',
};

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const initialRole = searchParams?.get('role');
  const [mode, setMode] = useState<AuthMode>('login');
  const [selectedRole, setSelectedRole] = useState<DashboardAccessRole>(
    initialRole === 'officer' || initialRole === 'vendor' || initialRole === 'company' ? initialRole : 'admin',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [profilePreview, setProfilePreview] = useState('');
  const [registeredOfficerEmail, setRegisteredOfficerEmail] = useState('');
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
    setSuccess('');
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
    setSuccess('');

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
    setSuccess('');

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

  const handleRegistrationOTPChange = (val: string, idx: number) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...registrationOtp];
    next[idx] = val.slice(-1);
    setRegistrationOtp(next);
    setRegistrationOtpVerified(false);
    if (val && idx < 5) {
      document.getElementById(`officer-registration-otp-${idx + 2}`)?.focus();
    }
  };

  const handleRegistrationOTPKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (event.key === 'Backspace' && !registrationOtp[idx] && idx > 0) {
      document.getElementById(`officer-registration-otp-${idx}`)?.focus();
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
      setSuccess('');
    };
    reader.readAsDataURL(file);
  };

  const clearProfileImage = () => {
    setProfilePreview('');
    setError('');
    setSuccess('');
  };

  const handleQuickDemoAccess = async (role: DashboardAccessRole) => {
    setSelectedRole(role);
    setLoading(true);
    setError('');
    setSuccess('');
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
    setSuccess('Demo data reset complete. You can now open any demo dashboard with one click.');
  };

  const handleSendOTP = async () => {
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    const res = await authService.sendOTP(email, selectedRole);
    setLoading(false);
    if (res.success) {
      setSuccess(`OTP sent to ${email}. Use 123456 for demo login.`);
    } else {
      setError(res.message);
    }
  };

  const handleSendOfficerRegistrationOTP = async () => {
    if (!registerForm.email.includes('@')) {
      setError('Enter a valid officer registration email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setRegistrationOtpVerified(false);
    setRegistrationOtpToken('');

    const result = await authService.sendOTP(
      registerForm.email,
      'officer',
      'registration',
      registerForm.name || registerForm.nameBn || 'Officer',
    );

    setLoading(false);

    if (result.success) {
      setSuccess(result.message || `OTP sent to ${registerForm.email}.`);
      setRegistrationOtpToken(result.otpToken || '');
      return;
    }

    setError(result.message || 'Unable to send registration OTP.');
  };

  const handleVerifyOfficerRegistrationOTP = async () => {
    if (!registerForm.email.includes('@')) {
      setError('Enter a valid officer registration email address.');
      return;
    }

    const code = registrationOtp.join('');
    if (code.length < 6) {
      setError('Enter the 6-digit registration OTP.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const result = await authService.verifyOTP(registerForm.email, code, 'officer', 'registration');

    setLoading(false);

    if (result.success && result.verifiedToken) {
      setRegistrationOtpVerified(true);
      setRegistrationOtpToken(result.verifiedToken);
      setSuccess('Registration OTP verified successfully.');
      return;
    }

    setRegistrationOtpVerified(false);
    setError('Invalid or expired registration OTP. Please request a new one.');
  };

  const handleOTPChange = (val: string, idx: number) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) {
      document.getElementById(`role-otp-${idx + 1}`)?.focus();
    }
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
    setSuccess('');
    const passwordResult = await authService.adminLogin(email, password, selectedRole);
    if (!passwordResult.success) {
      setLoading(false);
      setError(passwordResult.message || 'Invalid email or password for the selected role.');
      return;
    }

    if (isOfficerFlow && passwordResult.role) {
      setLoading(false);
      setMode('success');
      setTimeout(() => {
        window.location.href = DASHBOARD_ROUTES.officer;
      }, 1200);
      return;
    }

    const code = otp.join('');
    if (code.length < 6) {
      setLoading(false);
      setError('Enter the 6-digit OTP.');
      return;
    }

    const res = await authService.verifyOTP(email, code, selectedRole);
    setLoading(false);

    if (res.success && res.role) {
      window.location.href = DASHBOARD_ROUTES[res.role];
      return;
    }

    setError('Invalid OTP. Use 123456 for demo.');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (isOfficerFlow) {
      if (!registerForm.email.includes('@')) {
        setLoading(false);
        setError('Enter a valid officer email address.');
        return;
      }

      if (!registerForm.name.trim() || !registerForm.phone.trim() || !registerForm.password.trim()) {
        setLoading(false);
        setError('Please fill in all required officer information.');
        return;
      }

      if (!registrationOtpVerified || !registrationOtpToken) {
        setLoading(false);
        setError('Verify the OTP sent to your registration email before submitting.');
        return;
      }
    }

    const result = await authService.registerRoleUser({
      role: selectedRole,
      name: registerForm.name,
      nameBn: registerForm.nameBn,
      email: registerForm.email,
      phone: registerForm.phone,
      password: registerForm.password || 'password123',
      division: registerForm.division,
      district: registerForm.district,
      upazila: registerForm.upazila,
      designation: registerForm.designation,
      accessLabel: registerForm.accessLabel,
      specialtyTags: registerForm.specialtyTags.split(',').map((item) => item.trim()).filter(Boolean),
      regionDistricts: registerForm.regionDistricts.split(',').map((item) => item.trim()).filter(Boolean),
      deliveryDistricts: registerForm.deliveryDistricts.split(',').map((item) => item.trim()).filter(Boolean),
      cropInterests: registerForm.cropInterests.split(',').map((item) => item.trim()).filter(Boolean),
      cropTypes: registerForm.cropTypes.split(',').map((item) => item.trim()).filter(Boolean),
      landAcres: Number.parseFloat(registerForm.landAcres) || 0,
      bkashAccount: registerForm.bkashAccount,
      registrationNo: registerForm.registrationNo,
      companyName: registerForm.companyName || registerForm.name,
      avatar: profilePreview || undefined,
      registrationOtpToken: isOfficerFlow ? registrationOtpToken : undefined,
    });

    setLoading(false);

    if (!result.success || !result.user) {
      setError(result.message || 'Registration failed. Please check the information and try again.');
      return;
    }

    const createdUser = result.user;

    if (isOfficerFlow) {
      setRegisteredOfficerEmail(registerForm.email);
      setEmail(registerForm.email);
      setPassword('');
      setRegistrationOtp(['', '', '', '', '', '']);
      setRegistrationOtpVerified(false);
      setRegistrationOtpToken('');
      setRegisterForm(emptyRegisterForm);
      setProfilePreview('');
      setMode('registerSuccess');
      return;
    }

    setSuccess(`${roleConfig.label} account created successfully. Redirecting to dashboard...`);
    setRegisterForm(emptyRegisterForm);
    setProfilePreview('');
    setTimeout(() => {
      window.location.href = DASHBOARD_ROUTES[createdUser.role];
    }, 900);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div
        className="hidden lg:flex flex-col justify-between p-8 xl:p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #052e16 0%, #123524 45%, #2d6a4f 100%)' }}
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

        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold text-white">Role Based Access</h2>
          <p className="text-white/70 text-lg">
            Admin, officer, vendor, ar company dashboard access ekhane manage korun. Farmer login and registration er jonno dedicated farmer page use korun.
          </p>

          <div className="space-y-3">
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

        <div className="relative text-white/40 text-sm">© 2026 AgriculMS</div>
      </div>

      <div className="flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8 bg-white">
        <div className="w-full max-w-xl">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-forest rounded-full flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="text-forest font-bold text-lg">Agricul<span className="text-harvest">MS</span></span>
          </div>

          <div className="mb-6">
            <div className="inline-flex max-w-full rounded-full bg-gray-100 p-1 mb-5 overflow-x-auto">
              <button type="button" onClick={() => setMode('login')} className={`px-4 py-2 rounded-full text-sm font-semibold ${mode === 'login' ? 'bg-white text-forest shadow-sm' : 'text-gray-500'}`}>
                Login
              </button>
              <button type="button" onClick={() => setMode('register')} className={`px-4 py-2 rounded-full text-sm font-semibold ${mode === 'register' ? 'bg-white text-forest shadow-sm' : 'text-gray-500'}`}>
                Registration
              </button>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {mode === 'login' ? 'Dashboard Login' : 'Role Registration'}
            </h1>
            <p className="text-gray-500">
              {mode === 'login'
                ? (isOfficerFlow
                  ? 'Use officer email and password to access the advisory dashboard.'
                  : 'Select admin, officer, vendor, or company role and sign in with password and OTP verification.')
                : (isOfficerFlow
                  ? 'Officer registration uses email OTP verification before account creation.'
                  : 'Create an admin, officer, vendor, or company account and show it directly on the matching dashboard.')}
            </p>
          </div>

          <div className="mb-6">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700 mb-2 block">Select Role</span>
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value as DashboardAccessRole);
                  setError('');
                  setSuccess('');
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

          {mode === 'login' && (
            <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm font-semibold text-gray-800">Quick Demo Access</div>
                  <div className="text-xs text-gray-500">One click e admin, officer, vendor, ar company demo dashboard open hobe.</div>
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
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                  />
                  <button type="button" onClick={() => setShowPass((value) => !value)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isOfficerFlow && (
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <label className="block text-sm font-semibold text-gray-700">OTP Code</label>
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-light disabled:opacity-60"
                    >
                      <Mail className="w-4 h-4" />
                      {loading ? 'Sending...' : 'Send OTP'}
                    </button>
                  </div>
                  <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`role-otp-${i}`}
                        type="text"
                        inputMode="numeric"
                        value={digit}
                        onChange={(e) => handleOTPChange(e.target.value, i)}
                        className="h-12 w-12 sm:h-14 sm:w-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 transition-colors"
                        maxLength={1}
                      />
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}
              {success && <p className="text-green-600 text-sm">{success}</p>}

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? 'Logging in...' : <>Login <ArrowRight className="w-4 h-4" /></>}
              </button>

              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-blue-700 text-sm flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {isOfficerFlow
                    ? <>Officer login এখন direct email + password দিয়ে হবে. Registration-এর সময় email OTP verify করতে হবে.</>
                    : <>Password আর OTP দুইটাই লাগবে। Demo OTP: <strong>123456</strong></>}
                </p>
              </div>
            </form>
          ) : mode === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <input className="input-field" placeholder="Full Name" value={registerForm.name} onChange={(e) => setRegisterField('name', e.target.value)} required />
                <input className="input-field" placeholder="Name (BN)" value={registerForm.nameBn} onChange={(e) => setRegisterField('nameBn', e.target.value)} />
                {isOfficerFlow ? (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                    <div className="flex gap-3">
                      <input className="input-field flex-1" type="email" placeholder="officer@email.com" value={registerForm.email} onChange={(e) => {
                        setRegisterField('email', e.target.value);
                        setRegistrationOtpVerified(false);
                        setRegistrationOtpToken('');
                      }} required />
                      <button
                        type="button"
                        onClick={handleSendOfficerRegistrationOTP}
                        disabled={loading}
                        className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-white hover:bg-forest-light disabled:opacity-60"
                      >
                        {loading ? 'Sending...' : 'Send OTP'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">This email will receive the officer registration OTP.</p>
                  </div>
                ) : (
                  <input className="input-field" type="email" placeholder="Email" value={registerForm.email} onChange={(e) => setRegisterField('email', e.target.value)} required />
                )}
                <input className="input-field" placeholder="Phone Number" value={registerForm.phone} onChange={(e) => setRegisterField('phone', e.target.value)} required />
                <input className="input-field" type="password" placeholder="Password" value={registerForm.password} onChange={(e) => setRegisterField('password', e.target.value)} required />
                {isOfficerFlow && (
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <label className="block text-sm font-semibold text-gray-700">Registration OTP</label>
                      <button
                        type="button"
                        onClick={handleVerifyOfficerRegistrationOTP}
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
                          id={`officer-registration-otp-${i + 1}`}
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
                        ? 'Email OTP verified. You can submit the officer registration now.'
                        : 'Send OTP to your email, then enter the 6-digit code here and verify it.'}
                    </p>
                  </div>
                )}
                <div className="sm:col-span-2">
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
                        <span className="block text-sm text-gray-400">Optional field for every role.</span>
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
                        <div className="text-sm text-gray-400">You can still register even if you remove this image.</div>
                      </div>
                      <button type="button" onClick={clearProfileImage} className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700">
                        <X className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                <input className="input-field" placeholder="Designation / Title" value={registerForm.designation} onChange={(e) => setRegisterField('designation', e.target.value)} />
                <select className="input-field" value={registerForm.division} onChange={(e) => void handleDivisionChange(e.target.value)} required>
                  <option value="">Select division</option>
                  {DIVISIONS.map((division) => (
                    <option key={division} value={division}>{division}</option>
                  ))}
                </select>
                <div>
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
                      className="input-field"
                      placeholder="Upazila / Area"
                      value={registerForm.upazila}
                      onChange={(e) => setRegisterField('upazila', e.target.value)}
                      disabled={!registerForm.district}
                      required
                    />
                  )}
                  {locationError.upazilas && <p className="mt-2 text-xs text-amber-600">{locationError.upazilas}</p>}
                </div>
                <input className="input-field" placeholder="Access Label" value={registerForm.accessLabel} onChange={(e) => setRegisterField('accessLabel', e.target.value)} />

                {(selectedRole === 'vendor' || selectedRole === 'company') && (
                  <input className="input-field sm:col-span-2" placeholder="Company Name" value={registerForm.companyName} onChange={(e) => setRegisterField('companyName', e.target.value)} />
                )}

                {selectedRole === 'company' && (
                  <input className="input-field sm:col-span-2" placeholder="Registration No" value={registerForm.registrationNo} onChange={(e) => setRegisterField('registrationNo', e.target.value)} />
                )}

                {selectedRole === 'officer' && (
                  <>
                    <input className="input-field sm:col-span-2" placeholder="Specialties (comma separated)" value={registerForm.specialtyTags} onChange={(e) => setRegisterField('specialtyTags', e.target.value)} />
                    <input className="input-field sm:col-span-2" placeholder="Coverage Districts (comma separated)" value={registerForm.regionDistricts} onChange={(e) => setRegisterField('regionDistricts', e.target.value)} />
                  </>
                )}

                {selectedRole === 'vendor' && (
                  <input className="input-field sm:col-span-2" placeholder="Delivery Districts (comma separated)" value={registerForm.deliveryDistricts} onChange={(e) => setRegisterField('deliveryDistricts', e.target.value)} />
                )}

                {selectedRole === 'company' && (
                  <input className="input-field sm:col-span-2" placeholder="Crop Interests (comma separated)" value={registerForm.cropInterests} onChange={(e) => setRegisterField('cropInterests', e.target.value)} />
                )}

              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
              {success && <p className="text-green-600 text-sm">{success}</p>}

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? 'Creating account...' : <>Create {roleConfig.label} Account <UserPlus className="w-4 h-4" /></>}
              </button>
            </form>
          ) : mode === 'registerSuccess' ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted</h2>
              <p className="text-gray-500 mb-6">Officer details have been captured successfully. You can now log in with <strong>{registeredOfficerEmail || email}</strong>.</p>
              <button type="button" onClick={() => setMode('login')} className="btn-primary">
                Back to Officer Login
              </button>
            </div>
          ) : (
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

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Need farmer login or registration?{' '}
              <Link href="/auth/farmer-login" className="text-forest font-semibold hover:text-harvest">
                Farmer Login →
              </Link>
            </p>
          </div>
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
