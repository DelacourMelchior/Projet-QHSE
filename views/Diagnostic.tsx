import React, { useState, useEffect, useRef } from 'react';
import { Page } from '../types';
import { Info, Quote, TrendingDown, Users, AlertTriangle, Clock, Target, Anchor, TrendingUp, ShieldCheck, Zap, Layout, Check, RotateCcw, Mail, User, Building, FileText, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';

interface DiagnosticProps {
  onNavigate: (page: Page) => void;
}

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative flex items-center">
    <Info size={16} className="text-sb-green-dark/40 group-hover:text-sb-green-dark transition-colors cursor-help ml-2" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-sb-green-dark text-sb-beige text-xs leading-relaxed rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg text-center">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-sb-green-dark"></div>
    </div>
  </div>
);

const AnimatedNumber = ({ value }: { value: number }) => {
  const spring = useSpring(value, { mass: 1, stiffness: 50, damping: 15 });
  
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString('fr-FR')
  );

  return <motion.span>{display}</motion.span>;
};

const StepperInput = ({ value, onChange, label, tooltip }: { value: number, onChange: (val: number) => void, label: string, tooltip: string }) => (
  <div className="mb-6">
    <div className="flex items-center mb-2">
      <label className="block text-sm font-medium text-gray-600 uppercase tracking-wider text-xs">{label}</label>
      <InfoTooltip text={tooltip} />
    </div>
    <div className="flex items-center border border-gray-300 rounded-lg bg-white w-32 shadow-sm">
      <button 
        onClick={() => onChange(Math.max(0, value - 1))}
        className="px-3 py-2 text-sb-green-dark hover:bg-gray-50 transition-colors font-bold text-lg rounded-l-lg"
      >-</button>
      <input 
        type="number" 
        value={value} 
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="w-full text-center bg-transparent focus:outline-none font-mono text-sb-green-dark text-lg"
      />
      <button 
        onClick={() => onChange(value + 1)}
        className="px-3 py-2 text-sb-green-dark hover:bg-gray-50 transition-colors font-bold text-lg rounded-r-lg"
      >+</button>
    </div>
  </div>
);

const Diagnostic: React.FC<DiagnosticProps> = ({ onNavigate }) => {
  const [step, setStep] = useState<number>(0);
  const totalSteps = 13;

  // Step 1: ADN & Structure
  const [companyName, setCompanyName] = useState<string>('');
  const [companyAge, setCompanyAge] = useState<number>(0);
  const [companyPresentation, setCompanyPresentation] = useState<string>('');
  const [orgStructure, setOrgStructure] = useState<string>('');
  const [totalEmployees, setTotalEmployees] = useState<number>(0);

  // Step 2: Écosystème & Dynamique Commerciale
  const [targetClient, setTargetClient] = useState<string>('');
  const [profitableClients, setProfitableClients] = useState<string>('');
  const [problematicClients, setProblematicClients] = useState<string>('');
  const [acquisitionModel, setAcquisitionModel] = useState<string>('');

  // Step 3: Problèmes Internes
  const [internalProblems, setInternalProblems] = useState<string[]>([]);
  const [otherInternalProblem, setOtherInternalProblem] = useState<string>('');

  // Step 4: Analyse de Risque
  const [diagnosticInitial, setDiagnosticInitial] = useState<string>('');
  const [interventionHorizon, setInterventionHorizon] = useState<string>('');
  const [cadrageNotes, setCadrageNotes] = useState<string>('');

  // Step 5: Le Moteur Financier
  const [revenue, setRevenue] = useState<number>(0);
  const [netMargin, setNetMargin] = useState<number>(0);
  const [companyStatus, setCompanyStatus] = useState<string>('');

  // Step 6: Capital Humain & Frictions RH
  const [cadreSalary, setCadreSalary] = useState<number>(0);
  const [operationalSalary, setOperationalSalary] = useState<number>(0);
  const [executiveDepartures, setExecutiveDepartures] = useState<number>(0);
  const [executiveRampUpMonths, setExecutiveRampUpMonths] = useState<number>(0);
  const [operationalDepartures, setOperationalDepartures] = useState<number>(0);
  const [operationalRampUpMonths, setOperationalRampUpMonths] = useState<number>(0);
  const [absenteeismRate, setAbsenteeismRate] = useState<number>(0);
  const [rateAT, setRateAT] = useState<number>(0);
  const [rateMaladie, setRateMaladie] = useState<number>(0);

  // Step 7: Chaos Interne
  const [leaderLostHours, setLeaderLostHours] = useState<number>(0);
  const [excelFilesCount, setExcelFilesCount] = useState<number>(0);
  const [excelComplexity, setExcelComplexity] = useState<number>(0);
  const [kpiReviewDate, setKpiReviewDate] = useState<number>(0);

  // Step 8: Fuite Opérationnelle
  const [reworkPercent, setReworkPercent] = useState<number>(0);
  const [creditNotesAmount, setCreditNotesAmount] = useState<number>(0);
  const [monthlyDisputes, setMonthlyDisputes] = useState<number>(0);
  const [averageDisputeAmount, setAverageDisputeAmount] = useState<number>(0);
  const [missedRevenueStruct, setMissedRevenueStruct] = useState<number>(0);
  const [missedRevenueCertif, setMissedRevenueCertif] = useState<number>(0);

  // Step 10: Le Plan de Sécurisation
  const [auditChecklist, setAuditChecklist] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [conditions, setConditions] = useState<string>('');

  // Lead Capture
  const [userFirstName, setUserFirstName] = useState<string>('');
  const [userLastName, setUserLastName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLeadCaptured, setIsLeadCaptured] = useState<boolean>(false);
  const fullReportRef = useRef<HTMLDivElement>(null);
  const [yearlyDisputes, setYearlyDisputes] = useState<number>(0);

  // Calculations
  const weeksPerYear = 47;
  const hoursPerYear = 1607;
  
  const operationalCount = Math.floor(totalEmployees * 0.8);

  const operationalHourlyRate = operationalSalary / hoursPerYear;
  const executiveHourlyRate = cadreSalary / hoursPerYear;

  const synthesisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('diagnostic_data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.step !== undefined) setStep(data.step);
        if (data.companyName !== undefined) setCompanyName(data.companyName);
        if (data.companyAge !== undefined) setCompanyAge(data.companyAge);
        if (data.companyPresentation !== undefined) setCompanyPresentation(data.companyPresentation);
        if (data.orgStructure !== undefined) setOrgStructure(data.orgStructure);
        if (data.totalEmployees !== undefined) setTotalEmployees(data.totalEmployees);
        if (data.targetClient !== undefined) setTargetClient(data.targetClient);
        if (data.profitableClients !== undefined) setProfitableClients(data.profitableClients);
        if (data.problematicClients !== undefined) setProblematicClients(data.problematicClients);
        if (data.acquisitionModel !== undefined) setAcquisitionModel(data.acquisitionModel);
        if (data.internalProblems !== undefined) setInternalProblems(data.internalProblems);
        if (data.otherInternalProblem !== undefined) setOtherInternalProblem(data.otherInternalProblem);
        if (data.diagnosticInitial !== undefined) setDiagnosticInitial(data.diagnosticInitial);
        if (data.interventionHorizon !== undefined) setInterventionHorizon(data.interventionHorizon);
        if (data.cadrageNotes !== undefined) setCadrageNotes(data.cadrageNotes);
        if (data.revenue !== undefined) setRevenue(data.revenue);
        if (data.netMargin !== undefined) setNetMargin(data.netMargin);
        if (data.companyStatus !== undefined) setCompanyStatus(data.companyStatus);
        if (data.cadreSalary !== undefined) setCadreSalary(data.cadreSalary);
        if (data.operationalSalary !== undefined) setOperationalSalary(data.operationalSalary);
        if (data.executiveDepartures !== undefined) setExecutiveDepartures(data.executiveDepartures);
        if (data.executiveRampUpMonths !== undefined) setExecutiveRampUpMonths(data.executiveRampUpMonths);
        if (data.operationalDepartures !== undefined) setOperationalDepartures(data.operationalDepartures);
        if (data.operationalRampUpMonths !== undefined) setOperationalRampUpMonths(data.operationalRampUpMonths);
        if (data.absenteeismRate !== undefined) setAbsenteeismRate(data.absenteeismRate);
        if (data.rateAT !== undefined) setRateAT(data.rateAT);
        if (data.rateMaladie !== undefined) setRateMaladie(data.rateMaladie);
        if (data.leaderLostHours !== undefined) setLeaderLostHours(data.leaderLostHours);
        if (data.excelFilesCount !== undefined) setExcelFilesCount(data.excelFilesCount);
        if (data.excelComplexity !== undefined) setExcelComplexity(data.excelComplexity);
        if (data.kpiReviewDate !== undefined) setKpiReviewDate(data.kpiReviewDate);
        if (data.reworkPercent !== undefined) setReworkPercent(data.reworkPercent);
        if (data.creditNotesAmount !== undefined) setCreditNotesAmount(data.creditNotesAmount);
        if (data.yearlyDisputes !== undefined) setYearlyDisputes(data.yearlyDisputes);
        if (data.averageDisputeAmount !== undefined) setAverageDisputeAmount(data.averageDisputeAmount);
        if (data.missedRevenueStruct !== undefined) setMissedRevenueStruct(data.missedRevenueStruct);
        if (data.missedRevenueCertif !== undefined) setMissedRevenueCertif(data.missedRevenueCertif);
        if (data.auditChecklist !== undefined) setAuditChecklist(data.auditChecklist);
        if (data.startDate !== undefined) setStartDate(data.startDate);
        if (data.conditions !== undefined) setConditions(data.conditions);
      } catch (e) {
        console.error("Failed to load diagnostic data", e);
      }
    }
  }, []);

  useEffect(() => {
    const data = {
      step, companyName, companyAge, companyPresentation, orgStructure, totalEmployees,
      targetClient, profitableClients, problematicClients, acquisitionModel,
      internalProblems, otherInternalProblem, diagnosticInitial, interventionHorizon,
      cadrageNotes, revenue, netMargin, companyStatus, cadreSalary, operationalSalary,
      executiveDepartures, executiveRampUpMonths, operationalDepartures, operationalRampUpMonths,
      absenteeismRate, rateAT, rateMaladie, leaderLostHours, excelFilesCount,
      excelComplexity, kpiReviewDate, reworkPercent, creditNotesAmount, yearlyDisputes,
      averageDisputeAmount, missedRevenueStruct, missedRevenueCertif, auditChecklist,
      startDate, conditions,
      userFirstName, userLastName, userEmail, isLeadCaptured
    };
    localStorage.setItem('diagnostic_data', JSON.stringify(data));
  }, [
    step, companyName, companyAge, companyPresentation, orgStructure, totalEmployees,
    targetClient, profitableClients, problematicClients, acquisitionModel,
    internalProblems, otherInternalProblem, diagnosticInitial, interventionHorizon,
    cadrageNotes, revenue, netMargin, companyStatus, cadreSalary, operationalSalary,
    executiveDepartures, executiveRampUpMonths, operationalDepartures, operationalRampUpMonths,
    absenteeismRate, rateAT, rateMaladie, leaderLostHours, excelFilesCount,
    excelComplexity, kpiReviewDate, reworkPercent, creditNotesAmount, yearlyDisputes,
    averageDisputeAmount, missedRevenueStruct, missedRevenueCertif, auditChecklist,
    startDate, conditions,
    userFirstName, userLastName, userEmail, isLeadCaptured
  ]);

  useEffect(() => {
    if (synthesisRef.current) {
      const shouldScrollToTop = step >= 12;
      synthesisRef.current.scrollTo({
        top: shouldScrollToTop ? 0 : synthesisRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [step]);

  // 1. Turnover & Ramp-up (Capital Humain)
  const costTurnoverExec = executiveDepartures * (cadreSalary / 12) * executiveRampUpMonths * 0.5;
  const costTurnoverOp = operationalDepartures * (operationalSalary / 12) * operationalRampUpMonths * 0.5;
  const costTurnover = costTurnoverExec + costTurnoverOp;

  // 2. Absentéisme (Capital Humain)
  const totalAbsenteeismRate = rateAT + rateMaladie;
  const costAbsenteeism = (revenue * (Math.max(0, totalAbsenteeismRate - 5)) / 100) * 1.2;

  // 3. Dirigeant Goulot (Chaos Interne)
  const costLeaderLost = 200 * leaderLostHours * weeksPerYear;

  // 4. Fichiers Excel (Chaos Interne)
  const costExcel = excelFilesCount * Math.max(0, excelComplexity - 0.5) * 12 * executiveHourlyRate;

  // 4b. Coût du manque de pilotage (si trop peu de fichiers)
  // On estime qu'en dessous de 3 fichiers, on manque de visibilité sur les KPI critiques
  const costBlindness = excelFilesCount <= 3 ? (revenue * 0.005) : 0; // 0.5% du CA de risque si aveugle

  // 5. Pilotage Tardif (Chaos Interne)
  const costLateKPI = Math.max(0, (revenue / 365) * (kpiReviewDate - 5) * (netMargin / 100) * 12);

  // 6. Non-Qualité / Retouches (Fuite Opérationnelle)
  const costRework = revenue * (Math.max(0, reworkPercent - 3) / 100) * 0.10;

  // 7. Avoirs (Fuite Opérationnelle)
  const costCreditNotes = creditNotesAmount;

  // 8. Litiges (Fuite Opérationnelle)
  const costDisputes = yearlyDisputes * averageDisputeAmount * 0.10;

  // 10. Le Plan de Sécurisation (Manque à gagner)
  const costMissedRevenue = missedRevenueStruct + missedRevenueCertif;

  let cumulativeValue = 0;
  if (step >= 6) cumulativeValue += costTurnover;
  if (step >= 7) cumulativeValue += costAbsenteeism;
  if (step >= 8) cumulativeValue += costLeaderLost;
  if (step >= 9) cumulativeValue += costExcel + costLateKPI + costBlindness;
  if (step >= 10) cumulativeValue += costRework + costCreditNotes + costDisputes;
  if (step >= 11) cumulativeValue += costMissedRevenue;

  const handleReset = () => {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action est irréversible.")) {
      localStorage.removeItem('diagnostic_data');
      window.location.reload();
    }
  };

  const handleGeneratePDF = () => {
    if (!fullReportRef.current) return;

    const element = fullReportRef.current;
    const opt = {
      margin: [10, 10] as [number, number],
      filename: `Diagnostic_QHSE_${companyName || 'Export'}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="pt-12 pb-12 bg-sb-cream min-h-screen">
      <div className="container mx-auto px-4 max-w-[1600px]">
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl text-sb-green-dark leading-tight mb-2">
            Console de Diagnostic en Direct
          </h1>
          <p className="font-sans text-base text-sb-green-dark/70">
            Analyse de maturité et évaluation de l'Impôt Invisible.
          </p>
        </div>

        {/* Navigation Stepper */}
        <div className="mb-8 overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex items-center space-x-4 min-w-max">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const stepNum = i + 1;
              const isActive = step === stepNum;
              const isCompleted = step > stepNum;
              
              return (
                <button
                  key={stepNum}
                  onClick={() => setStep(stepNum)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all border ${
                    isActive 
                      ? 'bg-sb-green-dark text-white border-sb-green-dark shadow-md scale-105' 
                      : isCompleted
                        ? 'bg-sb-green-dark/10 text-sb-green-dark border-sb-green-dark/20 hover:bg-sb-green-dark/20'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-sb-green-dark/40 hover:text-sb-green-dark/60'
                  }`}
                >
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    isActive ? 'bg-white text-sb-green-dark' : isCompleted ? 'bg-sb-green-dark text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {stepNum}
                  </span>
                  <span className="text-sm font-medium whitespace-nowrap">
                    {stepNum === 1 && "ADN"}
                    {stepNum === 2 && "Écosystème"}
                    {stepNum === 3 && "Problèmes"}
                    {stepNum === 4 && "Risques"}
                    {stepNum === 5 && "Finances"}
                    {stepNum === 6 && "RH"}
                    {stepNum === 7 && "Absentéisme"}
                    {stepNum === 8 && "Dirigeant"}
                    {stepNum === 9 && "Pilotage"}
                    {stepNum === 10 && "Fuites"}
                    {stepNum === 11 && "Renversement"}
                    {stepNum === 12 && "Synthèse"}
                    {stepNum === 13 && "Audit"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Golden Ratio Layout */}
        <div className="flex flex-col lg:flex-row gap-6 h-[850px]">
          
          {/* Left Column: 38.2% (1/phi^2) - Zone de Pilotage Consultant */}
          {step > 0 && step < 12 && (
            <div className="w-full lg:flex-[38.2] bg-gray-50 p-8 border border-gray-200 shadow-inner flex flex-col rounded-xl relative">
            
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-200 rounded-t-xl overflow-hidden">
              <motion.div 
                className="h-full bg-sb-green-dark" 
                initial={{ width: 0 }}
                animate={{ width: `${(Math.min(step, totalSteps - 1) / (totalSteps - 1)) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>

            <h2 className="font-serif text-xl text-sb-green-dark mb-8 border-b border-gray-200 pb-4 flex items-center justify-between">
              <span>
                {step === 0 && "Introduction : Objectifs"}
                {step === 1 && "1. Saisie : ADN & Structure"}
                {step === 2 && "2. Saisie : Écosystème"}
                {step === 3 && "3. Saisie : Axes d'amélioration identifiés"}
                {step === 4 && "4. Saisie : Cadrage des actions souhaitées"}
                {step === 5 && "5. Saisie : Moteur Financier"}
                {step === 6 && "6. Saisie : Capital Humain"}
                {step === 7 && "7. Saisie : Absentéisme"}
                {step === 8 && "8. Saisie : Temps du Dirigeant"}
                {step === 9 && "9. Saisie : Pilotage"}
                {step === 10 && "10. Saisie : Fuite Opérationnelle"}
                {step === 11 && "11. Saisie : Le Renversement"}
                {step === 12 && "12. Synthèse des Coûts"}
                {step === 13 && "13. Proposition d'Audit"}
              </span>
              <span className="text-xs font-sans font-bold uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-1 rounded">Pilotage</span>
            </h2>
            
            <div className="space-y-8 flex-grow overflow-y-auto pr-2 custom-scrollbar">
              
              {/* Step 1-4: Same as before */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2 uppercase tracking-wider text-xs">Nom de l'entreprise</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Saisir le nom de l'entreprise..."
                      className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all text-lg text-gray-800 shadow-sm"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2 uppercase tracking-wider text-xs">Âge de l'entreprise (années)</label>
                    <input
                      type="number"
                      value={companyAge}
                      onChange={(e) => setCompanyAge(Number(e.target.value))}
                      className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all font-mono text-xl text-gray-800 shadow-sm"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2 uppercase tracking-wider text-xs">Analyse de l'activité</label>
                    <textarea
                      value={companyPresentation}
                      onChange={(e) => setCompanyPresentation(e.target.value)}
                      placeholder="Décrivez votre cœur de métier, votre proposition de valeur unique et vos principaux segments de clientèle."
                      className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all min-h-[120px] text-lg text-gray-800 shadow-sm"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2 uppercase tracking-wider text-xs">Analyse de l'organigramme</label>
                    <textarea
                      value={orgStructure}
                      onChange={(e) => setOrgStructure(e.target.value)}
                      placeholder="Détaillez la répartition des équipes, les niveaux hiérarchiques et les éventuels silos opérationnels constatés."
                      className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all min-h-[120px] text-lg text-gray-800 shadow-sm"
                    />
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <label className="block text-sm font-medium text-gray-600 uppercase tracking-wider text-xs">Effectif global déclaré</label>
                      <InfoTooltip text="Variable clé pour les calculs d'impact organisationnel." />
                    </div>
                    <input
                      type="number"
                      value={totalEmployees}
                      onChange={(e) => setTotalEmployees(Number(e.target.value))}
                      className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all font-mono text-xl text-gray-800 shadow-sm"
                    />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2 uppercase tracking-wider text-xs">Définition de la cible</label>
                    <input
                      type="text"
                      value={targetClient}
                      onChange={(e) => setTargetClient(e.target.value)}
                      placeholder="Saisir le profil client..."
                      className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all text-lg text-gray-800 shadow-sm"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2 uppercase tracking-wider text-xs">Identification clients rentables</label>
                    <input
                      type="text"
                      value={profitableClients}
                      onChange={(e) => setProfitableClients(e.target.value)}
                      placeholder="Saisir les profils rentables..."
                      className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all text-lg text-gray-800 shadow-sm"
                    />
                  </div>
                  <div className="mb-6">
                    <div className="flex items-center mb-2">
                      <label className="block text-sm font-medium text-gray-600 uppercase tracking-wider text-xs">Identification des clients les moins rentables</label>
                      <InfoTooltip text="Identifier les sources de friction externe qui consomment vos ressources." />
                    </div>
                    <input
                      type="text"
                      value={problematicClients}
                      onChange={(e) => setProblematicClients(e.target.value)}
                      placeholder="Saisir les profils problématiques..."
                      className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all text-lg text-gray-800 shadow-sm"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-600 mb-3 uppercase tracking-wider text-xs">Évaluation du modèle d'acquisition</label>
                    <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      {['Prospection active', 'Majorité de clients historiques', 'Mixte'].map((model) => (
                        <label key={model} onClick={() => setAcquisitionModel(model)} className="flex items-center space-x-3 cursor-pointer group p-2 hover:bg-gray-50 rounded transition-colors">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${acquisitionModel === model ? 'border-sb-green-dark bg-sb-green-dark' : 'border-gray-300 group-hover:border-sb-green-dark/60'}`}>
                            {acquisitionModel === model && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                          </div>
                          <span className="text-lg text-gray-700">{model}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-600 mb-2 uppercase tracking-wider text-xs">Axes d'optimisation interne</label>
                    <div className="space-y-2 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      {['Améliorer la visibilité financière', 'Clarifier les rôles et responsabilités', 'Réduire le turnover', 'Renforcer la cohésion', 'Optimiser les processus', 'Renforcer le leadership'].map((problem) => (
                        <label key={problem} className="flex items-center space-x-3 cursor-pointer group p-2 hover:bg-gray-50 rounded transition-colors">
                          <input 
                            type="checkbox" 
                            checked={internalProblems.includes(problem)}
                            onChange={(e) => {
                              if (e.target.checked) setInternalProblems([...internalProblems, problem]);
                              else setInternalProblems(internalProblems.filter(p => p !== problem));
                            }}
                            className="w-5 h-5 rounded border-gray-300 text-sb-green-dark focus:ring-sb-green-dark"
                          />
                          <span className="text-sm text-gray-700">{problem}</span>
                        </label>
                      ))}
                      <div className="pt-2">
                        <label className="flex items-center space-x-3 cursor-pointer p-2">
                          <input 
                            type="checkbox" 
                            checked={internalProblems.includes('Autre')}
                            onChange={(e) => {
                              if (e.target.checked) setInternalProblems([...internalProblems, 'Autre']);
                              else setInternalProblems(internalProblems.filter(p => p !== 'Autre'));
                            }}
                            className="w-5 h-5 rounded border-gray-300 text-sb-green-dark focus:ring-sb-green-dark"
                          />
                          <span className="text-sm text-gray-700">Autre</span>
                        </label>
                        {internalProblems.includes('Autre') && (
                          <input
                            type="text"
                            value={otherInternalProblem}
                            onChange={(e) => setOtherInternalProblem(e.target.value)}
                            placeholder="Précisez..."
                            className="w-full mt-2 p-2 border border-gray-300 rounded-lg text-sm"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Analyse de Risque et Plan d'Action */}
              {step === 4 && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-3 uppercase tracking-wider text-xs">Diagnostic initial du dirigeant</label>
                    <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      {['Risque financier identifié au préalable', 'Risque financier non mesuré jusqu\'à présent'].map((option) => (
                        <label key={option} onClick={() => setDiagnosticInitial(option)} className="flex items-center space-x-3 cursor-pointer group p-2 hover:bg-gray-50 rounded transition-colors">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${diagnosticInitial === option ? 'border-sb-green-dark bg-sb-green-dark' : 'border-gray-300 group-hover:border-sb-green-dark/60'}`}>
                            {diagnosticInitial === option && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                          </div>
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-3 uppercase tracking-wider text-xs">Horizon d'intervention souhaité</label>
                    <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      {['Immédiat - Sécurisation des marges', 'Court terme - Dans le trimestre', 'À redéfinir'].map((option) => (
                        <label key={option} onClick={() => setInterventionHorizon(option)} className="flex items-center space-x-3 cursor-pointer group p-2 hover:bg-gray-50 rounded transition-colors">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${interventionHorizon === option ? 'border-sb-green-dark bg-sb-green-dark' : 'border-gray-300 group-hover:border-sb-green-dark/60'}`}>
                            {interventionHorizon === option && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                          </div>
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2 uppercase tracking-wider text-xs">Notes de cadrage</label>
                    <textarea
                      value={cadrageNotes}
                      onChange={(e) => setCadrageNotes(e.target.value)}
                      placeholder="Saisir les remarques du client..."
                      className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all min-h-[120px] text-lg text-gray-800 shadow-sm"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 5: Le Moteur Financier */}
              {step === 5 && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="mb-8">
                    <div className="flex items-center mb-2">
                      <label className="block text-sm font-medium text-gray-600 uppercase tracking-wider text-xs">Saisie du Chiffre d'Affaires de référence</label>
                      <InfoTooltip text="Variable maîtresse pour calculer l'impact relatif des dysfonctionnements." />
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={revenue}
                        onChange={(e) => setRevenue(Number(e.target.value))}
                        className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all font-mono text-2xl text-gray-800 shadow-sm"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">€</span>
                    </div>
                  </div>
                  <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-600 mb-3 uppercase tracking-wider text-xs">Dynamique actuelle de l'entreprise</label>
                    <div className="grid grid-cols-3 gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      {['Croissance', 'Stagnation', 'Récession'].map((status) => (
                        <label 
                          key={status} 
                          onClick={() => setCompanyStatus(status)} 
                          className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all cursor-pointer text-center ${
                            companyStatus === status 
                              ? 'border-sb-green-dark bg-sb-green-dark/5 text-sb-green-dark' 
                              : 'border-gray-100 hover:border-sb-green-dark/40 text-gray-500'
                          }`}
                        >
                          <span className="text-sm font-bold">{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <label className="block text-sm font-medium text-gray-600 uppercase tracking-wider text-xs">Saisie de la Marge Nette estimée</label>
                      <InfoTooltip text="Permet d'évaluer la rentabilité réelle de l'entreprise." />
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={netMargin}
                        onChange={(e) => setNetMargin(Number(e.target.value))}
                        className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all font-mono text-xl text-gray-800 shadow-sm"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">%</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 6: Capital Humain & Frictions RH (Moved from 7) */}
              {step === 6 && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2 uppercase tracking-wider text-xs">Salaire moyen Super-Brut annuel - Cadres / Dirigeant (€)</label>
                    <input type="number" value={cadreSalary} onChange={(e) => setCadreSalary(Number(e.target.value))} className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all font-mono text-xl text-gray-800 shadow-sm" />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2 uppercase tracking-wider text-xs">Salaire moyen Super-Brut annuel - Opérationnels (€)</label>
                    <input type="number" value={operationalSalary} onChange={(e) => setOperationalSalary(Number(e.target.value))} className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all font-mono text-xl text-gray-800 shadow-sm" />
                  </div>
                  <StepperInput 
                    label="Départs cadres (12 mois)"
                    value={executiveDepartures}
                    onChange={setExecutiveDepartures}
                    tooltip="Nombre de départs sur les 12 derniers mois."
                  />
                  <StepperInput 
                    label="Mois pour autonomie cadre"
                    value={executiveRampUpMonths}
                    onChange={setExecutiveRampUpMonths}
                    tooltip="Temps nécessaire pour qu'une recrue cadre soit 100% autonome."
                  />
                  <StepperInput 
                    label="Départs opérationnels (12 mois)"
                    value={operationalDepartures}
                    onChange={setOperationalDepartures}
                    tooltip="Nombre de départs sur les 12 derniers mois."
                  />
                  <StepperInput 
                    label="Mois pour autonomie opérationnel"
                    value={operationalRampUpMonths}
                    onChange={setOperationalRampUpMonths}
                    tooltip="Temps nécessaire pour qu'une recrue opérationnelle soit 100% autonome."
                  />
                  <div className="mt-8 bg-[#F8F9FA] p-8 rounded-lg border border-[#E9ECEF] shadow-sm">
                    <p className="text-[#4A4A4A] text-base leading-relaxed">
                      <strong className="font-bold">Calcul du coût du turnover :</strong> Le coût est estimé en additionnant les frais de recrutement et la perte de productivité durant la période de montée en compétence (rampe d'autonomie, où la recrue est estimée à 50% de son plein potentiel).
                      <br />
                      <strong className="font-bold mt-2 block">Frais de recrutement :</strong> Estimation moyenne (ex: 20% du salaire annuel brut) incluant les frais d'agence, la diffusion d'annonces et le temps passé par les managers en entretiens.
                      <br />
                      <em className="italic block mt-2 text-gray-500">Formule : (Départs * ((Salaire annuel / 12) * Mois d'autonomie * 0,5)) + Frais de recrutement.</em>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 7: Absentéisme */}
              {step === 7 && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="mb-8 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <label className="block text-sm font-medium text-gray-600 uppercase tracking-wider text-xs">Taux d'absentéisme (AT)</label>
                      </div>
                      <span className="text-xl font-bold text-sb-green-dark font-mono bg-gray-100 px-3 py-1 rounded">{rateAT} %</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.1"
                      value={rateAT}
                      onChange={(e) => setRateAT(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sb-green-dark"
                    />
                  </div>
                  <div className="mb-8 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <label className="block text-sm font-medium text-gray-600 uppercase tracking-wider text-xs">Taux d'absentéisme (Maladie)</label>
                      </div>
                      <span className="text-xl font-bold text-sb-green-dark font-mono bg-gray-100 px-3 py-1 rounded">{rateMaladie} %</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="0.1"
                      value={rateMaladie}
                      onChange={(e) => setRateMaladie(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sb-green-dark"
                    />
                  </div>
                  <div className="mb-8 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-600 uppercase tracking-wider text-xs">Total Absentéisme</label>
                      <span className="text-xl font-bold text-sb-green-dark font-mono bg-gray-100 px-3 py-1 rounded">{(rateAT + rateMaladie).toFixed(1)} %</span>
                    </div>
                  </div>

                  {/* Encadré de détail du calcul - Style Image */}
                  <div className="bg-[#F8F9FA] p-8 rounded-lg border border-[#E9ECEF] shadow-sm">
                    <p className="text-[#4A4A4A] text-base leading-relaxed">
                      <strong className="font-bold">Calcul du coût de l'absentéisme :</strong> L'absentéisme représente un coût direct (maintien de salaire) et surtout un coût indirect (désorganisation, remplacement, perte de qualité).
                      <br />
                      <em className="italic block mt-2 text-gray-500">Formule : (CA * ((Taux AT + Taux Maladie) - 5%) / 100) * 1,2</em>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 8: Temps du Dirigeant */}
              {step === 8 && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="mb-8 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <label className="block text-sm font-medium text-gray-600 uppercase tracking-wider text-xs">Heures/semaine dirigeant (urgences/conflits)</label>
                      <span className="text-xl font-bold text-sb-green-dark font-mono bg-gray-100 px-3 py-1 rounded">{leaderLostHours} h/sem</span>
                    </div>
                    <input type="range" min="0" max="20" step="1" value={leaderLostHours} onChange={(e) => setLeaderLostHours(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sb-green-dark" />
                    
                    <div className="mt-8 bg-[#F8F9FA] p-8 rounded-lg border border-[#E9ECEF] shadow-sm">
                      <p className="text-[#4A4A4A] text-base leading-relaxed">
                        <strong className="font-bold">Calcul du coût du temps perdu :</strong> Valorisation du temps passé par le dirigeant sur des tâches à faible valeur ajoutée (urgences, conflits, micro-management).
                        <br />
                        <em className="italic block mt-2 text-gray-500">Formule : 200€/h * Heures perdues * 47 semaines.</em>
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 9: Pilotage */}
              {step === 9 && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <StepperInput 
                    label="Nombre de fichiers Excel utilisés pour le pilotage"
                    value={excelFilesCount}
                    onChange={setExcelFilesCount}
                    tooltip="Chaque fichier est une source d'erreur et de temps perdu."
                  />

                  {/* Jauge d'équilibre */}
                  <div className="mb-8 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-medium text-gray-600 uppercase tracking-wider text-xs">Diagnostic de structure</label>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        excelFilesCount <= 3 ? 'bg-red-100 text-red-700' :
                        excelFilesCount <= 5 ? 'bg-orange-100 text-orange-700' :
                        excelFilesCount <= 10 ? 'bg-green-100 text-green-700' :
                        excelFilesCount <= 15 ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {excelFilesCount <= 3 ? 'Risque d\'aveuglement' :
                         excelFilesCount <= 5 ? 'Sous-pilotage' :
                         excelFilesCount <= 10 ? 'Zone d\'équilibre' :
                         excelFilesCount <= 15 ? 'Complexité croissante' :
                         'Chaos Opérationnel'}
                      </div>
                    </div>
                    
                    <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-red-400 opacity-30 border-r border-white" style={{ width: '15%' }}></div>
                      <div className="h-full bg-orange-400 opacity-30 border-r border-white" style={{ width: '10%' }}></div>
                      <div className="h-full bg-green-400 opacity-30 border-r border-white" style={{ width: '25%' }}></div>
                      <div className="h-full bg-orange-400 opacity-30 border-r border-white" style={{ width: '25%' }}></div>
                      <div className="h-full bg-red-400 opacity-30" style={{ width: '25%' }}></div>
                      
                      {/* Curseur de position */}
                      <motion.div 
                        className="absolute top-0 bottom-0 w-1 bg-gray-800 z-10"
                        animate={{ left: `${Math.min(100, (excelFilesCount / 20) * 100)}%` }}
                        transition={{ type: "spring", stiffness: 100 }}
                      />
                    </div>
                    
                    <div className="relative mt-2 h-6 text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                      <span className="absolute left-0 -translate-x-1/2">0</span>
                      <span className="absolute left-[15%] -translate-x-1/2">3</span>
                      <span className="absolute left-[25%] -translate-x-1/2">5</span>
                      <span className="absolute left-[50%] -translate-x-1/2">10</span>
                      <span className="absolute left-[75%] -translate-x-1/2">15</span>
                      <span className="absolute left-[100%] -translate-x-1/2">20+</span>
                    </div>

                    <p className="mt-4 text-xs text-gray-500 italic leading-relaxed">
                      {excelFilesCount <= 3 ? 
                        "Attention : Trop peu de fichiers peut indiquer un manque de données pour piloter l'activité efficacement." :
                        excelFilesCount <= 5 ?
                        "Risque : Le pilotage semble incomplet, vous manquez probablement de visibilité sur certains KPI." :
                        excelFilesCount <= 10 ? 
                        "Bravo : Vous semblez avoir une structure de pilotage contenue. L'enjeu est maintenant l'automatisation." :
                        excelFilesCount <= 15 ?
                        "Alerte : La complexité augmente, le risque d'erreur humaine et de désynchronisation est réel." :
                        "Critique : Le nombre élevé de fichiers génère du 'bruit' et des erreurs de saisie manuelles chronophages."
                      }
                    </p>
                  </div>

                  <div className="mb-8 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <label className="block text-sm font-medium text-gray-600 uppercase tracking-wider text-xs">Complexité moyenne (h/mois/fichier)</label>
                        <InfoTooltip text="Estimation du temps perdu par fichier par mois (recherche, correction, double saisie)." />
                      </div>
                      <span className="text-xl font-bold text-sb-green-dark font-mono bg-gray-100 px-3 py-1 rounded">{excelComplexity} h</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={excelComplexity}
                      onChange={(e) => setExcelComplexity(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sb-green-dark"
                    />
                    <div className="flex justify-between mt-2 text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                      <span>Simple (0.5h)</span>
                      <span>Standard (2h)</span>
                      <span>Critique (10h)</span>
                    </div>
                  </div>
                  <div className="mt-4 bg-[#F8F9FA] p-6 rounded-lg border border-[#E9ECEF] shadow-sm mb-8">
                    <p className="text-[#4A4A4A] text-sm leading-relaxed">
                      <strong className="font-bold">Coût du Pilotage Excel :</strong> Chaque fichier Excel non structuré est une source d'erreur et de temps perdu (estimé à {excelComplexity}h - 0,5h de traitement incompressible / mois / fichier).
                      {excelFilesCount <= 3 && (
                        <span className="block mt-2 text-orange-600 font-medium">
                          + Risque d'aveuglement : Le manque d'outils de pilotage vous expose à des dérives non détectées (estimé à 0.5% du CA).
                        </span>
                      )}
                      <br />
                      <em className="italic block mt-1 text-gray-500">Formule : (Nombre de fichiers * ({excelComplexity}h - 0,5h) * 12 mois * Taux horaire cadre) {excelFilesCount <= 3 ? "+ (0.5% * CA)" : ""}.</em>
                    </p>
                  </div>
                  <div className="mb-6">
                    <div className="flex items-center mb-3">
                      <label className="block text-sm font-medium text-gray-600 uppercase tracking-wider text-xs">Fréquence et date de revue des KPI</label>
                      <InfoTooltip text="Le retard de pilotage coûte cher. Plus l'information est tardive, moins vous pouvez corriger les dérives." />
                    </div>
                    <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      {[
                        { label: "Pilotage Temps Réel (Dashboard automatisé)", value: 0 },
                        { label: "Revue Hebdomadaire (Réactivité forte)", value: 2 },
                        { label: "Mensuel - Début de mois (J+5)", value: 5 },
                        { label: "Mensuel - Milieu de mois (J+15)", value: 15 },
                        { label: "Mensuel - Fin de mois (J+30)", value: 30 },
                        { label: "Trimestriel / Aléatoire", value: 60 },
                        { label: "Aucun pilotage / Données non traitées", value: 120 }
                      ].map((option) => (
                        <label key={option.value} onClick={() => setKpiReviewDate(option.value)} className="flex items-center space-x-3 cursor-pointer group p-2 hover:bg-gray-50 rounded transition-colors">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${kpiReviewDate === option.value ? 'border-sb-green-dark bg-sb-green-dark' : 'border-gray-300 group-hover:border-sb-green-dark/60'}`}>
                            {kpiReviewDate === option.value && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                          </div>
                          <span className="text-sm text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 bg-[#F8F9FA] p-6 rounded-lg border border-[#E9ECEF] shadow-sm">
                    <p className="text-[#4A4A4A] text-sm leading-relaxed">
                      <strong className="font-bold">Coût du retard de pilotage :</strong> Le retard dans la prise de décision impacte directement la capacité à corriger les dérives de marge.
                      <br />
                      <em className="italic block mt-1 text-gray-500">Formule : (CA / 365) * (Date de revue - 5) * (Marge Nette / 100) * 12.</em>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 10: Fuite Opérationnelle */}
              {step === 10 && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="mb-8 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <label className="block text-sm font-medium text-gray-600 uppercase tracking-wider text-xs">% de dossiers nécessitant une retouche</label>
                        <InfoTooltip text="Coût de non-qualité. Seuil de performance : 1% à 3%." />
                      </div>
                      <span className="text-xl font-bold text-sb-green-dark font-mono bg-gray-100 px-3 py-1 rounded">{reworkPercent} %</span>
                    </div>
                    <input type="range" min="0" max="30" step="1" value={reworkPercent} onChange={(e) => setReworkPercent(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sb-green-dark" />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2 uppercase tracking-wider text-xs">Montant total des avoirs clients (12 mois) (€)</label>
                    <input type="number" value={creditNotesAmount} onChange={(e) => setCreditNotesAmount(Number(e.target.value))} className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all font-mono text-xl text-gray-800 shadow-sm" />
                  </div>
                  <StepperInput 
                    label="Nombre de litiges clients par an"
                    value={yearlyDisputes}
                    onChange={setYearlyDisputes}
                    tooltip="Génère du cash bloqué et du temps perdu."
                  />
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2 uppercase tracking-wider text-xs">Montant moyen d'une facture en litige (€)</label>
                    <input type="number" value={averageDisputeAmount} onChange={(e) => setAverageDisputeAmount(Number(e.target.value))} className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all font-mono text-xl text-gray-800 shadow-sm" />
                  </div>
                  <div className="mt-8 bg-[#F8F9FA] p-8 rounded-lg border border-[#E9ECEF] shadow-sm">
                    <p className="text-[#4A4A4A] text-base leading-relaxed">
                      <strong className="font-bold">Calcul de la fuite opérationnelle :</strong> Somme des coûts de non-qualité (retouches), des avoirs clients et du temps de gestion des litiges.
                      <br />
                      <em className="italic block mt-2 text-gray-500">Formule : (CA * (% Retouches - 3%) * 10%) + Avoirs + (Litiges * 10%).</em>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 11: Le Renversement */}
              {step === 11 && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2 uppercase tracking-wider text-xs">CA raté par manque de structure (estimation €)</label>
                    <input type="number" value={missedRevenueStruct} onChange={(e) => setMissedRevenueStruct(Number(e.target.value))} className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all font-mono text-xl text-gray-800 shadow-sm" />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2 uppercase tracking-wider text-xs">CA raté faute de certifications/agréments (estimation €)</label>
                    <input type="number" value={missedRevenueCertif} onChange={(e) => setMissedRevenueCertif(Number(e.target.value))} className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-sb-green-dark focus:ring-1 focus:ring-sb-green-dark transition-all font-mono text-xl text-gray-800 shadow-sm" />
                  </div>
                </motion.div>
              )}

                  {/* Steps 0 to 11 logic... */}
                  {step > 0 && step <= 11 && (
                    <div className="text-gray-500 italic text-sm">
                      Utilisez les contrôles ci-dessous pour renseigner les données.
                    </div>
                  )}

            </div>

            {/* Navigation Buttons */}
            {step < totalSteps && (
              <div className="flex justify-between mt-6 pt-6 border-t border-gray-200">
                <button 
                  onClick={() => setStep(s => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className={`px-4 py-3 text-sm font-bold uppercase tracking-widest transition-colors rounded ${step === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                  Précédent
                </button>
                <button 
                  onClick={() => setStep(s => Math.min(totalSteps, s + 1))}
                  className="px-8 py-3 bg-sb-green-dark text-white text-sm font-bold uppercase tracking-widest hover:bg-sb-green-dark/90 transition-colors rounded shadow-sm"
                >
                  {step === 0 ? "Commencer le Diagnostic" : step === 11 ? "Générer Bilan" : "Suivant"}
                </button>
              </div>
            )}
            {step === totalSteps && (
              <div className="flex justify-start mt-6 pt-6 border-t border-gray-200">
                <button 
                  onClick={() => setStep(0)}
                  className="px-4 py-3 text-sm font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-200 transition-colors rounded"
                >
                  Nouvelle Saisie
                </button>
              </div>
            )}
          </div>
          )}

          {/* Right Column: 61.8% (1/phi) - Écran de Restitution Client */}
          <div className={`w-full ${step === 0 || step >= 12 ? 'lg:flex-1' : 'lg:flex-[61.8]'} bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col overflow-hidden`}>
            
            {/* Header Restitution - Removed as per request */}
            <div ref={synthesisRef} className="p-8 overflow-y-auto custom-scrollbar flex-grow bg-gray-50/30">
              {step === 13 ? (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="max-w-5xl mx-auto py-8 space-y-16"
                >
                  <div className="text-center mb-16">
                    <h2 className="font-serif text-4xl md:text-5xl text-sb-green-dark mb-6 uppercase tracking-tight">Audit de Robustesse Opérationnelle</h2>
                    <div className="w-24 h-1 bg-sb-beige mx-auto mb-6"></div>
                    <p className="text-xl text-gray-600 font-light max-w-3xl mx-auto">Une immersion stratégique pour transformer vos gisements de profit invisibles en résultats concrets.</p>
                  </div>

                  {!isLeadCaptured && (
                    <div className="max-w-3xl mx-auto mb-16">
                      <div className="bg-white p-8 rounded-xl border-2 border-sb-green-dark shadow-2xl">
                        <div className="flex items-center space-x-3 mb-6">
                          <div className="p-2 bg-sb-green-dark/10 rounded-lg text-sb-green-dark">
                            <Mail size={24} />
                          </div>
                          <h3 className="font-serif text-2xl text-sb-green-dark">Recevoir ce rapport par email</h3>
                        </div>
                        
                        <p className="text-gray-600 mb-8 leading-relaxed">
                          Pour débloquer l'export PDF complet de votre diagnostic et recevoir votre feuille de route confidentielle, merci de valider vos coordonnées.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Prénom</label>
                            <input
                              type="text"
                              value={userFirstName}
                              onChange={(e) => setUserFirstName(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-sb-green-dark outline-none"
                              placeholder="Jean"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nom</label>
                            <input
                              type="text"
                              value={userLastName}
                              onChange={(e) => setUserLastName(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-sb-green-dark outline-none"
                              placeholder="Dupont"
                            />
                          </div>
                        </div>

                        <div className="mb-8">
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Email Professionnel</label>
                          <input
                            type="email"
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-sb-green-dark outline-none"
                            placeholder="jean.dupont@entreprise.fr"
                          />
                        </div>

                        <button
                          onClick={() => {
                            if (userEmail && userFirstName && userLastName) {
                              setIsLeadCaptured(true);
                            } else {
                              alert("Merci de remplir tous les champs.");
                            }
                          }}
                          className="w-full py-4 bg-sb-green-dark text-white font-bold uppercase tracking-widest rounded-lg hover:bg-sb-green-dark/90 transition-all flex items-center justify-center space-x-3"
                        >
                          <Check size={20} />
                          <span>Accéder au Rapport Complet</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 left-0 w-full h-1 bg-sb-green-dark/10 group-hover:bg-sb-green-dark transition-colors"></div>
                      <span className="text-xs font-bold text-sb-green-dark/40 uppercase tracking-widest mb-4 block">Phase 1 : Cadrage (OFF-SITE)</span>
                      <h3 className="font-serif text-2xl text-sb-green-dark mb-4">L'Analyse Documentaire</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">Analyse des Pré-requis et cartographie des standards incontournables de votre marché pour préparer l'intervention.</p>
                    </div>
                    <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 left-0 w-full h-1 bg-sb-green-dark/10 group-hover:bg-sb-green-dark transition-colors"></div>
                      <span className="text-xs font-bold text-sb-green-dark/40 uppercase tracking-widest mb-4 block">Phase 2 : Immersion (ON-SITE)</span>
                      <h3 className="font-serif text-2xl text-sb-green-dark mb-4">L'Audit sur Site</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">Audit des Flux et évaluation in-situ de la résilience de vos processus face à des scénarios critiques.</p>
                    </div>
                    <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 left-0 w-full h-1 bg-sb-green-dark/10 group-hover:bg-sb-green-dark transition-colors"></div>
                      <span className="text-xs font-bold text-sb-green-dark/40 uppercase tracking-widest mb-4 block">Phase 3 : Feuille de Route (RESTITUTION)</span>
                      <h3 className="font-serif text-2xl text-sb-green-dark mb-4">Restitution & Plan d'Action</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">Remise du Rapport d'Étonnement et du Plan Directeur. Nous livrons une feuille de route priorisée.</p>
                    </div>
                  </div>

                  <div className="bg-sb-green-dark text-white p-12 rounded-2xl shadow-xl">
                    <h3 className="font-serif text-3xl mb-12 text-center uppercase tracking-wide">Vos Bénéfices</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="flex gap-6">
                        <div className="w-12 h-12 bg-sb-beige/20 rounded-lg flex items-center justify-center flex-shrink-0"><TrendingUp size={24} className="text-sb-beige" /></div>
                        <div>
                          <h4 className="font-bold text-sb-beige text-xl mb-2 uppercase tracking-wide">Gain de Marge Direct</h4>
                          <p className="text-sb-beige/80 text-sm">Optimisation des coûts et maximisation de la rentabilité opérationnelle.</p>
                        </div>
                      </div>
                      <div className="flex gap-6">
                        <div className="w-12 h-12 bg-sb-beige/20 rounded-lg flex items-center justify-center flex-shrink-0"><ShieldCheck size={24} className="text-sb-beige" /></div>
                        <div>
                          <h4 className="font-bold text-sb-beige text-xl mb-2 uppercase tracking-wide">Sécurisation du CA</h4>
                          <p className="text-sb-beige/80 text-sm">Renforcement de la résilience et protection de votre chiffre d'affaires.</p>
                        </div>
                      </div>
                      <div className="flex gap-6">
                        <div className="w-12 h-12 bg-sb-beige/20 rounded-lg flex items-center justify-center flex-shrink-0"><Zap size={24} className="text-sb-beige" /></div>
                        <div>
                          <h4 className="font-bold text-sb-beige text-xl mb-2 uppercase tracking-wide">Fin du Chaos Interne</h4>
                          <p className="text-sb-beige/80 text-sm">Fluidification des processus et apaisement du climat social.</p>
                        </div>
                      </div>
                      <div className="flex gap-6">
                        <div className="w-12 h-12 bg-sb-beige/20 rounded-lg flex items-center justify-center flex-shrink-0"><Layout size={24} className="text-sb-beige" /></div>
                        <div>
                          <h4 className="font-bold text-sb-beige text-xl mb-2 uppercase tracking-wide">Architecture du Futur</h4>
                          <p className="text-sb-beige/80 text-sm">Mise en place d'une structure agile et scalable pour soutenir votre croissance.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900 text-white p-12 rounded-2xl shadow-2xl border border-sb-beige/20">
                    <div className="max-w-4xl mx-auto">
                      <h3 className="font-serif text-3xl text-sb-beige mb-12 text-center uppercase tracking-widest">Bilan de Performance</h3>
                      
                      <div className="p-8 bg-emerald-600/10 border border-emerald-600/30 rounded-xl text-center mb-12">
                        <span className="block text-xs uppercase tracking-widest text-emerald-400 mb-2">Total Potentiel Récupérable</span>
                        <span className="text-4xl font-mono font-bold text-emerald-500">
                          <AnimatedNumber value={cumulativeValue} /> € / an
                        </span>
                        <p className="mt-4 text-sm text-gray-400 italic">Un levier de performance immédiat pour votre organisation.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10">
                          <span className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Investissement</span>
                          <span className="text-3xl font-bold text-sb-beige">4 000 € HT</span>
                        </div>
                        <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10">
                          <span className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Temps de retour sur investissement</span>
                          <span className="text-3xl font-bold text-sb-beige">
                            {cumulativeValue > 0 
                              ? (() => {
                                  const val = 4000 / (cumulativeValue / 365);
                                  return (val - Math.floor(val) <= 0.5) ? Math.floor(val) : Math.ceil(val);
                                })() 
                              : 0} jours
                          </span>
                        </div>
                      </div>

                      <div className="p-8 bg-red-600/10 border border-red-600/30 rounded-xl text-center">
                        <span className="block text-xs uppercase tracking-widest text-red-400 mb-2">Coût journalier de l'inaction</span>
                        <span className="text-4xl font-mono font-bold text-red-500">
                          <AnimatedNumber value={Math.round(cumulativeValue / 365)} /> € / jour
                        </span>
                        <p className="mt-4 text-sm text-gray-400 italic">Chaque jour sans décision vous coûte ce montant en impôt invisible.</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-8 print:hidden">
                    {!isLeadCaptured && step === 13 ? (
                      <div className="p-6 bg-sb-beige/10 border border-sb-beige/30 rounded-xl">
                        <p className="text-sb-green-dark font-medium italic">Remplissez le formulaire à gauche pour débloquer l'exportation.</p>
                      </div>
                    ) : (
                      <button 
                        onClick={handleGeneratePDF}
                        className="px-12 py-6 bg-sb-green-dark text-white font-bold uppercase tracking-widest rounded shadow-2xl hover:bg-sb-green-dark/90 transition-all transform hover:-translate-y-1 flex items-center mx-auto space-x-3"
                      >
                        <Download size={20} />
                        <span>Télécharger le rapport (PDF)</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-8">
                
                {step === 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center p-4 max-w-5xl mx-auto h-full"
                  >
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl text-center space-y-6 w-full max-w-3xl">
                      <div className="w-14 h-14 bg-sb-green-dark/5 rounded-full flex items-center justify-center mx-auto">
                        <Target size={28} className="text-sb-green-dark animate-pulse" />
                      </div>
                      
                      <div className="space-y-3">
                        <h2 className="text-4xl md:text-6xl font-serif text-sb-green-dark leading-tight">
                          Diagnostic de Performance
                        </h2>
                        <p className="text-xl text-gray-600 font-light leading-relaxed mx-auto">
                          L'objectif de cette séance est d'identifier les gisements de marge inexploités au sein de votre organisation, de localiser précisément ces opportunités et d'estimer le potentiel financier récupérable.
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-6 w-full pt-6 border-t border-gray-100">
                        <div className="space-y-1">
                          <div className="text-xl font-mono font-bold text-sb-green-dark">30 min</div>
                          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">DURÉE ESTIMÉE</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xl font-mono font-bold text-sb-green-dark">12</div>
                          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">ÉTAPES</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xl font-mono font-bold text-sb-green-dark">100%</div>
                          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">CONFIDENTIALITÉ</div>
                        </div>
                      </div>

                      <div className="pt-6">
                        <button 
                          onClick={() => setStep(1)}
                          className="px-8 py-3 bg-sb-green-dark text-white font-bold uppercase tracking-widest rounded-full shadow-xl hover:bg-sb-green-dark/90 transition-all transform hover:scale-105 text-sm"
                        >
                          Commencer le diagnostic
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step > 0 && (
                  <div className="space-y-8">
                    {/* Synthesis Header */}
                    {step >= 1 && (
                      <div className="bg-sb-green-dark text-white p-6 rounded-t-xl mb-0 flex items-center justify-between">
                        <div>
                          <h2 className="font-serif text-2xl uppercase tracking-wider">Rapport de Synthèse</h2>
                          <p className="text-xs opacity-60 uppercase tracking-widest mt-1">Diagnostic Performance Opérationnelle</p>
                        </div>
                        {step === 12 && (
                          <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/20">
                            <span className="text-xs font-bold uppercase tracking-widest text-sb-beige">Statut : Terminé</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="bg-white p-6 rounded-b-xl border border-gray-100 shadow-sm space-y-8">
                      {/* Bloc 1: Profil de l'Entreprise */}
                      {/* ... (keep existing Bloc 1 content) ... */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm"
                      >
                        <h3 className="font-sans font-bold text-sm uppercase tracking-widest text-gray-400 mb-6 flex items-center">
                          <Users size={16} className="mr-2" /> Profil de l'Entreprise
                        </h3>
                        
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <AnimatePresence>
                              {step >= 1 && companyName && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                  className="bg-gray-50 p-4 rounded-lg border border-gray-100"
                                >
                                  <span className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Nom de l'entreprise</span>
                                  <p className="text-gray-800 font-medium">{companyName}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <AnimatePresence>
                              {step >= 1 && companyAge > 0 && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                  className="bg-gray-50 p-4 rounded-lg border border-gray-100"
                                >
                                  <span className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Âge de l'entreprise</span>
                                  <p className="text-gray-800 font-medium">{companyAge} ans</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <AnimatePresence>
                            {step >= 1 && companyPresentation && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-sb-green-dark/5 p-6 rounded-xl border border-sb-green-dark/10"
                              >
                                <h4 className="font-sans font-bold text-[10px] uppercase tracking-widest text-sb-green-dark/60 mb-2">Présentation de l'activité</h4>
                                <p className="text-gray-800 text-lg leading-relaxed">{companyPresentation}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <AnimatePresence>
                              {step >= 1 && orgStructure && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                  className="bg-gray-50 p-4 rounded-lg border border-gray-100"
                                >
                                  <span className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Structure organisationnelle</span>
                                  <p className="text-gray-800 font-medium">{orgStructure}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <AnimatePresence>
                              {step >= 1 && totalEmployees > 0 && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                  className="bg-gray-50 p-4 rounded-lg border border-gray-100"
                                >
                                  <span className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Effectif global</span>
                                  <p className="text-gray-800 font-medium">{totalEmployees} salariés</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>

                      {/* Bloc 2: Performance & Marché */}
                      <AnimatePresence>
                        {step >= 2 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm"
                          >
                            <h3 className="font-sans font-bold text-sm uppercase tracking-widest text-gray-400 mb-6 flex items-center">
                              <TrendingUp size={16} className="mr-2" /> Performance & Marché
                            </h3>
                            
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {step >= 2 && targetClient && (
                                  <div className="bg-sb-green-dark/5 p-3 rounded-lg border border-sb-green-dark/10">
                                    <span className="block text-[10px] uppercase tracking-widest text-sb-green-dark/60 mb-1">Cible</span>
                                    <p className="text-sb-green-dark font-bold">{targetClient}</p>
                                  </div>
                                )}
                                {step >= 2 && acquisitionModel && (
                                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Modèle d'acquisition</span>
                                    <p className="text-gray-900 font-medium">{acquisitionModel}</p>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {step >= 2 && profitableClients && (
                                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                    <span className="block text-[10px] uppercase tracking-widest text-green-600/60 mb-1">Clients Rentables</span>
                                    <p className="text-green-800 font-medium">{profitableClients}</p>
                                  </div>
                                )}
                                {step >= 2 && problematicClients && (
                                  <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                                    <span className="block text-[10px] uppercase tracking-widest text-red-600/60 mb-1">Clients les moins rentables</span>
                                    <p className="text-red-800 font-medium">{problematicClients}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Bloc 3: Axes d'améliorations à prioriser */}
                      <AnimatePresence>
                        {step >= 3 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-6 rounded-xl border border-green-100 shadow-sm"
                          >
                            <h3 className="font-sans font-bold text-sm uppercase tracking-widest text-green-600 mb-4 flex items-center border-b border-green-100 pb-2">
                              <TrendingDown size={16} className="mr-2" /> Axes d'améliorations à prioriser
                            </h3>
                            {internalProblems.length > 0 && (
                              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <h4 className="font-sans font-bold text-[10px] uppercase tracking-widest text-gray-500 mb-3">Zones de Friction Identifiées</h4>
                                <p className="text-sm font-medium text-gray-900 leading-relaxed">
                                  {internalProblems.filter(p => p !== 'Autre').join(', ')}
                                  {internalProblems.includes('Autre') && (otherInternalProblem ? `, Autre: ${otherInternalProblem}` : ', Autre')}
                                </p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Bloc 4: Cadrage des actions souhaitées */}
                      <AnimatePresence>
                        {step >= 4 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm"
                          >
                            <h3 className="font-sans font-bold text-sm uppercase tracking-widest text-gray-400 mb-6 flex items-center">
                              <AlertTriangle size={16} className="mr-2" /> Cadrage des actions souhaitées
                            </h3>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <p className="text-sm text-gray-800"><span className="font-bold">Diagnostic:</span> {diagnosticInitial || 'Non défini'}</p>
                                  <p className="text-sm text-gray-800"><span className="font-bold">Horizon:</span> {interventionHorizon || 'Non défini'}</p>
                                </div>
                                {cadrageNotes && (
                                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="block text-[9px] uppercase tracking-widest text-gray-400 mb-1">Commentaires</span>
                                    <p className="text-xs text-gray-900 italic leading-relaxed">{cadrageNotes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Bloc 5: Moteur Financier */}
                      <AnimatePresence>
                        {step >= 5 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm"
                          >
                            <h3 className="font-sans font-bold text-sm uppercase tracking-widest text-gray-400 mb-6 flex items-center">
                              <TrendingUp size={16} className="mr-2" /> Moteur Financier
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <span className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1">CA Référence</span>
                                <p className="text-lg font-mono font-bold text-sb-green-dark">{revenue.toLocaleString('fr-FR')} €</p>
                              </div>
                              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <span className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1">Marge Nette</span>
                                <p className="text-lg font-mono font-bold text-sb-green-dark">{netMargin} %</p>
                              </div>
                              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <span className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1">Dynamique</span>
                                <p className={`text-lg font-bold ${
                                  companyStatus === 'Croissance' ? 'text-green-600' : 
                                  companyStatus === 'Récession' ? 'text-red-600' : 'text-orange-600'
                                }`}>{companyStatus}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Bloc 6: Coûts de l'Impôt Invisible */}
                      <AnimatePresence>
                        {step >= 6 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm"
                          >
                            <h3 className="font-sans font-bold text-sm uppercase tracking-widest text-emerald-600 mb-4 flex items-center border-b border-emerald-100 pb-2">
                              <TrendingUp size={16} className="mr-2" /> Potentiel Récupérable
                            </h3>
                            <div className="space-y-3">
                              {step >= 6 && (
                                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-emerald-900">Total Turnover</span>
                                    <span className="text-[10px] text-emerald-700 leading-tight">Impact des départs et ramp-up</span>
                                  </div>
                                  <span className="font-mono font-bold text-emerald-700"><AnimatedNumber value={costTurnover} /> €</span>
                                </div>
                              )}
                              {step >= 7 && (
                                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-emerald-900">Total Absentéisme</span>
                                    <span className="text-[10px] text-emerald-700 leading-tight">Impact direct et indirect (seuil 5%)</span>
                                  </div>
                                  <span className="font-mono font-bold text-emerald-700"><AnimatedNumber value={costAbsenteeism} /> €</span>
                                </div>
                              )}
                              {step >= 8 && (
                                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-emerald-900">Total Temps Dirigeant</span>
                                    <span className="text-[10px] text-emerald-700 leading-tight">Valorisation des urgences et micro-management</span>
                                  </div>
                                  <span className="font-mono font-bold text-emerald-700"><AnimatedNumber value={costLeaderLost} /> €</span>
                                </div>
                              )}
                              {step >= 9 && (
                                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-emerald-900">Total Pilotage</span>
                                    <span className="text-[10px] text-emerald-700 leading-tight">Pilotage Excel et retard de décision</span>
                                  </div>
                                  <span className="font-mono font-bold text-emerald-700"><AnimatedNumber value={costExcel + costLateKPI + costBlindness} /> €</span>
                                </div>
                              )}
                              {step >= 10 && (
                                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                                  <span className="text-sm font-medium text-emerald-900">Total Non-Qualité & Trésorerie</span>
                                  <span className="font-mono font-bold text-emerald-700"><AnimatedNumber value={costRework + costCreditNotes + costDisputes} /> €</span>
                                </div>
                              )}
                              {step >= 11 && (
                                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                                  <span className="text-sm font-medium text-emerald-900">Total Croissance Bridée</span>
                                  <span className="font-mono font-bold text-emerald-700"><AnimatedNumber value={costMissedRevenue} /> €</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

            {/* Sticky Summary Window */}
            <AnimatePresence>
              {step >= 6 && step <= 12 && (
                <motion.div 
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="p-4 bg-white border-t border-gray-200 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-20"
                >
                  <div className="max-w-3xl mx-auto space-y-3">
                    <div className="flex justify-center items-center p-6 bg-emerald-600 text-white rounded-lg shadow-md">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Total Potentiel Récupérable</span>
                        <span className="text-3xl font-mono font-bold"><AnimatedNumber value={cumulativeValue} /> € / an</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation for Full Width Steps */}
            {step >= 12 && (
              <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <button 
                  onClick={() => setStep(s => s - 1)}
                  className="px-6 py-3 text-sm font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-200 transition-colors rounded"
                >
                  Retour à la saisie
                </button>
                {step === 12 && (
                  <button 
                    onClick={() => setStep(13)}
                    className="px-10 py-3 bg-sb-green-dark text-white text-sm font-bold uppercase tracking-widest hover:bg-sb-green-dark/90 transition-colors rounded shadow-md"
                  >
                    Voir proposition d'intervention
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>


      {/* Hidden container for full PDF report - Positioned off-screen for capture */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0', width: '210mm' }}>
        <div ref={fullReportRef} className="p-10 bg-white text-sb-green-dark">
          <div className="text-center mb-10 border-b-2 border-sb-green-dark pb-6">
            <h1 className="text-3xl font-serif mb-2">Rapport de Diagnostic QHSE</h1>
            <p className="text-sm opacity-70">Généré le {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          
          <div className="space-y-10">
            {/* Business Profile */}
            <section className="p-6 border border-gray-100 rounded-xl bg-gray-50">
              <h2 className="text-lg font-bold uppercase tracking-widest mb-4 border-b pb-2">1. Profil de l'Organisation</h2>
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div><span className="opacity-60 uppercase text-[10px] block">Entreprise</span><strong>{companyName || 'N/A'}</strong></div>
                <div><span className="opacity-60 uppercase text-[10px] block">Effectif</span><strong>{totalEmployees || 'N/A'} salariés</strong></div>
                <div><span className="opacity-60 uppercase text-[10px] block">Âge</span><strong>{companyAge || 'N/A'} ans</strong></div>
                <div><span className="opacity-60 uppercase text-[10px] block">Structure</span><strong>{orgStructure || 'N/A'}</strong></div>
              </div>
            </section>

            {/* Financial Leakage */}
            <section className="p-6 border border-emerald-100 rounded-xl bg-emerald-50">
              <h2 className="text-lg font-bold uppercase tracking-widest mb-4 text-emerald-800 border-b border-emerald-200 pb-2">2. Évaluation de l'Impôt Invisible</h2>
              <div className="text-center py-6">
                <span className="block text-[10px] uppercase tracking-widest text-emerald-600 mb-2">Potentiel de Gain Annuel Récupérable</span>
                <div className="text-4xl font-mono font-bold text-emerald-700">{cumulativeValue.toLocaleString('fr-FR')} € / an</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center mt-4">
                <div className="p-3 bg-white rounded border border-emerald-100">
                  <span className="block text-[9px] uppercase tracking-widest text-gray-400">Absentéisme</span>
                  <div className="font-bold text-sm">{absenteeismRate.toLocaleString('fr-FR')} %</div>
                </div>
                <div className="p-3 bg-white rounded border border-emerald-100">
                  <span className="block text-[9px] uppercase tracking-widest text-gray-400">Temps Dirigeant</span>
                  <div className="font-bold text-sm">{leaderLostHours} h/sem</div>
                </div>
                <div className="p-3 bg-white rounded border border-emerald-100">
                  <span className="block text-[9px] uppercase tracking-widest text-gray-400">Coût Inaction</span>
                  <div className="font-bold text-sm text-red-600">{Math.round(cumulativeValue/365)} €/j</div>
                </div>
              </div>
            </section>

            {/* Internal Issues */}
            <section className="p-6 border border-gray-100 rounded-xl">
              <h2 className="text-lg font-bold uppercase tracking-widest mb-4 border-b pb-2">3. Zones de Friction Critiques</h2>
              <div className="text-sm leading-relaxed text-gray-700">
                {internalProblems.length > 0 
                  ? internalProblems.join(', ')
                  : "Aucune friction majeure déclarée."}
              </div>
            </section>

            {/* Audit Roadmap */}
            <section className="p-8 bg-sb-green-dark text-white rounded-xl">
              <h2 className="text-xl font-serif mb-6 text-sb-beige uppercase tracking-widest text-center">Plan Directeur Proposé</h2>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>Diagnostic Initial</span>
                  <span className="font-bold">{diagnosticInitial || 'Standard'}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>Horizon d'Intervention</span>
                  <span className="font-bold">{interventionHorizon || 'À définir'}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>Investissement Estimé</span>
                  <span className="font-bold">4 000 € HT</span>
                </div>
              </div>
              <p className="mt-8 text-[10px] text-center opacity-50 italic">
                Ce document constitue une base de travail pour l'audit sur site.
              </p>
            </section>
          </div>
          
          <div className="mt-20 text-[10px] text-center text-gray-400 border-t pt-4">
            Cabinet Delacour - Expertise QHSE & Performance Durable
          </div>
        </div>
      </div>

      {/* Floating Reset Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={handleReset}
          className="group flex items-center space-x-2 bg-white text-sb-green-dark p-3 rounded-full shadow-lg border border-gray-200 hover:bg-red-50 hover:text-red-600 transition-all transform hover:scale-110"
          title="Réinitialiser le diagnostic"
        >
          <RotateCcw size={20} className="group-hover:rotate-[-45deg] transition-transform" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-sm font-bold uppercase tracking-widest">
            Réinitialiser
          </span>
        </button>
      </div>
    </div>
  );
};

export default Diagnostic;
