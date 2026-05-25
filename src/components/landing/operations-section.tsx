"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  FiActivity,
  FiArrowRight,
  FiCheckCircle,
  FiClipboard,
  FiFileText,
  FiMapPin,
  FiUsers,
} from "react-icons/fi";
import type { IconType } from "react-icons";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const featureCards: Array<{
  title: string;
  description: string;
  icon: IconType;
  accent: string;
}> = [
  {
    title: "Mobile checklists",
    description: "Guide teams through site work, safety checks, openings, closings, and recurring tasks.",
    icon: FiClipboard,
    accent: "bg-[#eef5ff] text-[#3820d7]",
  },
  {
    title: "Task management",
    description: "Assign owners, watch progress, and escalate blocked work before the shift closes.",
    icon: FiUsers,
    accent: "bg-[#eaf9f2] text-[#12b886]",
  },
  {
    title: "Form templates",
    description: "Standardize inspections, incidents, handovers, and manager reviews across locations.",
    icon: FiFileText,
    accent: "bg-[#fff4db] text-[#d97706]",
  },
  {
    title: "Conditional forms",
    description: "Reveal the right fields based on answers so every report captures clean operational context.",
    icon: FiActivity,
    accent: "bg-[#eef2ff] text-[#4f46e5]",
  },
];

const statusCards = [
  { label: "Tasks completed", value: "91%", tone: "text-[#12b886]" },
  { label: "Locations online", value: "42", tone: "text-[#3820d7]" },
  { label: "Needs review", value: "7", tone: "text-[#d97706]" },
];

const workflow = ["Checklist opened", "Photo captured", "Manager reviewed", "Timeline updated"];

export function OperationsSection() {
  return (
    <section className="section-shell connected-band overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white to-transparent" />
      <div className="section-inner grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          className="relative order-2 min-h-[520px] lg:order-1"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-120px" }}
        >
          <motion.div
            className="absolute inset-0 rounded-lg bg-[#dcecff]"
            variants={itemVariants}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="visual-card absolute inset-x-5 top-8 min-h-[440px] overflow-hidden bg-white"
            variants={itemVariants}
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <Image
              src="/images/featured_two.png"
              alt="Employee using mobile checklist at work"
              fill
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#101735]/55 via-transparent to-white/10" />
          </motion.div>

          <motion.div
            className="absolute left-0 top-0 w-[250px] rounded-lg border border-white/70 bg-white/92 p-4 shadow-[0_22px_48px_rgba(31,49,88,0.16)] backdrop-blur"
            variants={itemVariants}
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-[#17204a]">Opening checklist</p>
              <span className="rounded bg-[#eaf9f2] px-2 py-1 text-[11px] font-black text-[#0f9f70]">
                Live
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {workflow.map((step, index) => (
                <motion.div
                  key={step}
                  className="flex items-center gap-3 text-xs font-extrabold text-[#536079]"
                  initial={{ opacity: 0.45 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.08 }}
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-[#12b886] text-white">
                    <FiCheckCircle aria-hidden="true" className="text-[11px]" />
                  </span>
                  {step}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="absolute bottom-3 right-0 w-[280px] rounded-lg border border-[#dfe9f8] bg-white/94 p-4 shadow-[0_24px_55px_rgba(31,49,88,0.18)] backdrop-blur"
            variants={itemVariants}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-[#eef5ff] text-[#3820d7]">
                <FiMapPin aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-[#17204a]">Field visibility</p>
                <p className="text-xs font-semibold text-[#68748c]">Operations health, today</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {statusCards.map((card) => (
                <div key={card.label} className="rounded-md bg-[#f6f9ff] p-3">
                  <p className={`text-lg font-black ${card.tone}`}>{card.value}</p>
                  <p className="mt-1 text-[10px] font-extrabold uppercase leading-4 text-[#68748c]">
                    {card.label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="order-1 lg:order-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-120px" }}
        >
          <motion.p variants={itemVariants} className="section-kicker text-[#22376d]">
            Daily operations
          </motion.p>
          <h2 className="section-title mt-4 max-w-xl">
            See the job get done in real time.
          </h2>
          <motion.p variants={itemVariants} className="section-copy mt-5 max-w-lg">
            Keep staff on track with forms, checklists, manager visibility, and field-ready updates that turn work into verified history.
          </motion.p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              

              return (
                <motion.article
                  key={feature.title}
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                  className="landing-card bg-white/86 p-4 shadow-[0_18px_40px_rgba(31,49,88,0.08)] backdrop-blur transition hover:border-[#b9cdf1]"
                >
                  <div className="flex items-start gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${feature.accent}`}>
                      <Icon aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-[#17204a]">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#5b657d]">{feature.description}</p>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>

          <motion.div variants={itemVariants} className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#demo"
              className="landing-button-primary motion-shine"
            >
              Explore operations
              <FiArrowRight aria-hidden="true" />
            </a>
            <span className="feature-check text-[#536079]">
              <FiCheckCircle aria-hidden="true" className="text-[#12b886]" />
              Built for distributed teams
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
