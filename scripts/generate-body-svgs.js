#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'body')
mkdirSync(OUT, { recursive: true })

const BG = '#070c16'
const S1 = '#2a4a65'
const S2 = '#1a3050'

function svg(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300">
  <rect width="200" height="300" fill="${BG}"/>
  ${content}
</svg>`
}

const BASE = {
  'head-front': svg(`
  <ellipse cx="100" cy="118" rx="68" ry="84" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <ellipse cx="30" cy="122" rx="9" ry="15" fill="${BG}" stroke="${S1}" stroke-width="2"/>
  <ellipse cx="170" cy="122" rx="9" ry="15" fill="${BG}" stroke="${S1}" stroke-width="2"/>
  <ellipse cx="76" cy="102" rx="14" ry="9" fill="none" stroke="${S1}" stroke-width="2"/>
  <ellipse cx="124" cy="102" rx="14" ry="9" fill="none" stroke="${S1}" stroke-width="2"/>
  <path d="M94,115 L86,148 Q100,156 114,148 L106,115" fill="none" stroke="${S1}" stroke-width="1.8"/>
  <path d="M78,170 Q100,184 122,170" fill="none" stroke="${S1}" stroke-width="2"/>
  <path d="M42,155 Q100,218 158,155" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M82,198 L78,270 Q100,278 122,270 L118,198" fill="none" stroke="${S1}" stroke-width="2"/>
  <line x1="100" y1="202" x2="100" y2="268" stroke="${S2}" stroke-width="1" stroke-dasharray="3,3"/>
  `),

  'head-back': svg(`
  <ellipse cx="100" cy="118" rx="68" ry="84" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <ellipse cx="30" cy="122" rx="9" ry="15" fill="${BG}" stroke="${S1}" stroke-width="2"/>
  <ellipse cx="170" cy="122" rx="9" ry="15" fill="${BG}" stroke="${S1}" stroke-width="2"/>
  <path d="M55,65 Q100,45 145,65" fill="none" stroke="${S1}" stroke-width="2"/>
  <path d="M38,145 Q100,175 162,145" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <line x1="100" y1="198" x2="100" y2="268" stroke="${S2}" stroke-width="1.5" stroke-dasharray="4,3"/>
  <path d="M82,198 L78,270 Q100,278 122,270 L118,198" fill="none" stroke="${S1}" stroke-width="2"/>
  `),

  'head-left': svg(`
  <path d="M80,40 Q50,45 38,80 Q30,110 35,145 Q40,175 60,195 Q80,210 100,208 Q130,205 148,188 Q165,170 165,145 Q165,100 148,72 Q132,45 110,38 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <ellipse cx="138" cy="130" rx="20" ry="30" fill="${BG}" stroke="${S1}" stroke-width="2"/>
  <path d="M95,100 L85,135 Q100,143 112,135 L105,100" fill="none" stroke="${S1}" stroke-width="1.8"/>
  <path d="M78,165 Q100,178 118,165" fill="none" stroke="${S1}" stroke-width="2"/>
  <path d="M95,205 L88,270 Q100,278 112,270 L105,205" fill="none" stroke="${S1}" stroke-width="2"/>
  `),

  'head-right': svg(`
  <path d="M120,40 Q150,45 162,80 Q170,110 165,145 Q160,175 140,195 Q120,210 100,208 Q70,205 52,188 Q35,170 35,145 Q35,100 52,72 Q68,45 90,38 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <ellipse cx="62" cy="130" rx="20" ry="30" fill="${BG}" stroke="${S1}" stroke-width="2"/>
  <path d="M105,100 L115,135 Q100,143 88,135 L95,100" fill="none" stroke="${S1}" stroke-width="1.8"/>
  <path d="M82,165 Q100,178 122,165" fill="none" stroke="${S1}" stroke-width="2"/>
  <path d="M95,205 L88,270 Q100,278 112,270 L105,205" fill="none" stroke="${S1}" stroke-width="2"/>
  `),

  'chest-front': svg(`
  <path d="M45,10 L155,10 Q175,12 178,40 L178,200 Q175,215 155,218 L45,218 Q25,215 22,200 L22,40 Q25,12 45,10 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <line x1="100" y1="15" x2="100" y2="210" stroke="${S2}" stroke-width="1.5" stroke-dasharray="4,3"/>
  <path d="M100,20 L48,38" stroke="${S1}" stroke-width="2"/>
  <path d="M100,20 L152,38" stroke="${S1}" stroke-width="2"/>
  <path d="M40,55 Q30,75 32,100" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M38,78 Q28,98 30,122" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M38,100 Q28,118 30,142" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M160,55 Q170,75 168,100" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M162,78 Q172,98 170,122" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M162,100 Q172,118 170,142" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <ellipse cx="72" cy="52" rx="20" ry="25" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <ellipse cx="128" cy="52" rx="20" ry="25" fill="none" stroke="${S2}" stroke-width="1.2"/>
  `),

  'chest-back': svg(`
  <path d="M45,10 L155,10 Q175,12 178,40 L178,200 Q175,215 155,218 L45,218 Q25,215 22,200 L22,40 Q25,12 45,10 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <line x1="100" y1="15" x2="100" y2="210" stroke="${S1}" stroke-width="1.8" stroke-dasharray="4,3"/>
  <path d="M35,42 C28,52 26,68 30,78 C36,85 48,82 52,72 Z" fill="none" stroke="${S1}" stroke-width="2"/>
  <path d="M165,42 C172,52 174,68 170,78 C164,85 152,82 148,72 Z" fill="none" stroke="${S1}" stroke-width="2"/>
  <path d="M40,100 Q30,120 32,145" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M38,122 Q28,142 30,165" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M160,100 Q170,120 168,145" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M162,122 Q172,142 170,165" fill="none" stroke="${S2}" stroke-width="1.2"/>
  `),

  'chest-left': svg(`
  <path d="M80,10 L140,10 Q158,15 160,50 L160,200 Q158,218 140,220 L80,220 Q62,218 60,200 L60,50 Q62,15 80,10 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <path d="M65,55 Q55,75 57,100" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M63,78 Q53,98 55,122" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M63,100 Q53,118 55,142" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <ellipse cx="118" cy="55" rx="28" ry="32" fill="none" stroke="${S2}" stroke-width="1.2"/>
  `),

  'chest-right': svg(`
  <path d="M60,10 L120,10 Q138,15 140,50 L140,200 Q138,218 120,220 L60,220 Q42,218 40,200 L40,50 Q42,15 60,10 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <path d="M135,55 Q145,75 143,100" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M137,78 Q147,98 145,122" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M137,100 Q147,118 145,142" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <ellipse cx="82" cy="55" rx="28" ry="32" fill="none" stroke="${S2}" stroke-width="1.2"/>
  `),

  'abdomen-front': svg(`
  <path d="M38,10 L162,10 Q178,15 180,50 L178,240 Q170,268 155,270 L45,270 Q30,268 22,240 L20,50 Q22,15 38,10 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <line x1="100" y1="12" x2="100" y2="265" stroke="${S2}" stroke-width="1.2" stroke-dasharray="4,3"/>
  <circle cx="100" cy="115" r="8" fill="none" stroke="${S1}" stroke-width="2"/>
  <line x1="100" y1="107" x2="100" y2="95" stroke="${S1}" stroke-width="1.5"/>
  <path d="M42,55 Q35,80 38,105" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M40,80 Q33,105 36,128" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M158,55 Q165,80 162,105" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M160,80 Q167,105 164,128" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M35,200 Q100,218 165,200" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M38,235 Q100,248 162,235" fill="none" stroke="${S1}" stroke-width="1.8"/>
  `),

  'abdomen-back': svg(`
  <path d="M38,10 L162,10 Q178,15 180,50 L178,240 Q170,268 155,270 L45,270 Q30,268 22,240 L20,50 Q22,15 38,10 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <line x1="100" y1="12" x2="100" y2="265" stroke="${S1}" stroke-width="2" stroke-dasharray="4,3"/>
  <path d="M42,55 Q35,80 38,105" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M40,80 Q33,105 36,128" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M158,55 Q165,80 162,105" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M160,80 Q167,105 164,128" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M70,220 Q100,240 130,220" fill="none" stroke="${S1}" stroke-width="2"/>
  <ellipse cx="80" cy="240" rx="22" ry="18" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <ellipse cx="120" cy="240" rx="22" ry="18" fill="none" stroke="${S2}" stroke-width="1.5"/>
  `),

  'back-front': svg(`
  <path d="M30,10 L170,10 Q188,15 190,50 L188,258 Q182,275 165,278 L35,278 Q18,275 12,258 L10,50 Q12,15 30,10 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <line x1="100" y1="12" x2="100" y2="272" stroke="${S1}" stroke-width="2" stroke-dasharray="5,3"/>
  <path d="M38,38 C30,50 28,68 34,80 C40,90 55,88 58,76 Z" fill="none" stroke="${S1}" stroke-width="2"/>
  <path d="M162,38 C170,50 172,68 166,80 C160,90 145,88 142,76 Z" fill="none" stroke="${S1}" stroke-width="2"/>
  <path d="M42,95 Q30,118 32,145" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M38,118 Q26,140 28,168" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M38,142 Q26,164 28,190" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M158,95 Q170,118 168,145" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M162,118 Q174,140 172,168" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M162,142 Q174,164 172,190" fill="none" stroke="${S2}" stroke-width="1.2"/>
  `),

  'back-back': svg(`
  <path d="M30,10 L170,10 Q188,15 190,50 L188,258 Q182,275 165,278 L35,278 Q18,275 12,258 L10,50 Q12,15 30,10 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <line x1="100" y1="12" x2="100" y2="272" stroke="${S1}" stroke-width="2.5" stroke-dasharray="6,4"/>
  <path d="M34,30 C28,42 26,58 32,70 C38,80 52,78 56,66 Z" fill="none" stroke="${S1}" stroke-width="2.2"/>
  <path d="M166,30 C172,42 174,58 168,70 C162,80 148,78 144,66 Z" fill="none" stroke="${S1}" stroke-width="2.2"/>
  <path d="M42,88 Q30,110 32,138" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M38,110 Q26,132 28,160" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M36,132 Q24,155 26,182" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M158,88 Q170,110 168,138" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M162,110 Q174,132 172,160" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M164,132 Q176,155 174,182" fill="none" stroke="${S2}" stroke-width="1.2"/>
  `),

  'back-left': svg(`
  <path d="M75,10 L140,10 Q158,15 160,50 L158,258 Q152,275 135,278 L75,278 Q58,275 52,258 L50,50 Q52,15 75,10 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <path d="M62,35 C56,47 54,63 60,75 C66,85 80,83 84,71 Z" fill="none" stroke="${S1}" stroke-width="2"/>
  <path d="M65,92 Q55,115 58,143" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M62,115 Q52,138 54,165" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M60,138 Q50,162 52,188" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <line x1="105" y1="12" x2="105" y2="272" stroke="${S2}" stroke-width="1.2" stroke-dasharray="4,3"/>
  `),

  'back-right': svg(`
  <path d="M60,10 L125,10 Q148,15 150,50 L148,258 Q142,275 125,278 L60,278 Q42,275 40,258 L38,50 Q40,15 60,10 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <path d="M138,35 C144,47 146,63 140,75 C134,85 120,83 116,71 Z" fill="none" stroke="${S1}" stroke-width="2"/>
  <path d="M135,92 Q145,115 142,143" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M138,115 Q148,138 146,165" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M140,138 Q150,162 148,188" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <line x1="95" y1="12" x2="95" y2="272" stroke="${S2}" stroke-width="1.2" stroke-dasharray="4,3"/>
  `),

  'full-front': svg(`
  <ellipse cx="100" cy="30" rx="22" ry="26" fill="${BG}" stroke="${S1}" stroke-width="2.2"/>
  <path d="M68,58 L68,125 Q100,132 132,125 L132,58 Q116,50 100,50 Q84,50 68,58 Z" fill="${BG}" stroke="${S1}" stroke-width="2.2"/>
  <path d="M68,125 L65,158 Q100,165 135,158 L132,125 Q100,132 68,125 Z" fill="${BG}" stroke="${S1}" stroke-width="2.2"/>
  <path d="M45,58 L38,108 Q44,114 52,110 L60,58 Z" fill="${BG}" stroke="${S1}" stroke-width="2"/>
  <path d="M155,58 L162,108 Q156,114 148,110 L140,58 Z" fill="${BG}" stroke="${S1}" stroke-width="2"/>
  <path d="M72,158 L68,230 Q80,236 88,232 L90,158 Z" fill="${BG}" stroke="${S1}" stroke-width="2"/>
  <path d="M128,158 L132,230 Q120,236 112,232 L110,158 Z" fill="${BG}" stroke="${S1}" stroke-width="2"/>
  <path d="M68,232 Q74,260 78,278 Q88,284 92,278 L92,232" fill="${BG}" stroke="${S1}" stroke-width="1.8"/>
  <path d="M132,232 Q126,260 122,278 Q112,284 108,278 L108,232" fill="${BG}" stroke="${S1}" stroke-width="1.8"/>
  <line x1="100" y1="52" x2="100" y2="162" stroke="${S2}" stroke-width="1" stroke-dasharray="3,3"/>
  `),

  'full-back': svg(`
  <ellipse cx="100" cy="30" rx="22" ry="26" fill="${BG}" stroke="${S1}" stroke-width="2.2"/>
  <path d="M68,58 L68,125 Q100,132 132,125 L132,58 Q116,50 100,50 Q84,50 68,58 Z" fill="${BG}" stroke="${S1}" stroke-width="2.2"/>
  <path d="M68,125 L65,158 Q100,165 135,158 L132,125 Q100,132 68,125 Z" fill="${BG}" stroke="${S1}" stroke-width="2.2"/>
  <path d="M45,58 L38,108 Q44,114 52,110 L60,58 Z" fill="${BG}" stroke="${S1}" stroke-width="2"/>
  <path d="M155,58 L162,108 Q156,114 148,110 L140,58 Z" fill="${BG}" stroke="${S1}" stroke-width="2"/>
  <path d="M72,158 L68,230 Q80,236 88,232 L90,158 Z" fill="${BG}" stroke="${S1}" stroke-width="2"/>
  <path d="M128,158 L132,230 Q120,236 112,232 L110,158 Z" fill="${BG}" stroke="${S1}" stroke-width="2"/>
  <path d="M68,232 Q74,260 78,278 Q88,284 92,278 L92,232" fill="${BG}" stroke="${S1}" stroke-width="1.8"/>
  <path d="M132,232 Q126,260 122,278 Q112,284 108,278 L108,232" fill="${BG}" stroke="${S1}" stroke-width="1.8"/>
  <line x1="100" y1="52" x2="100" y2="162" stroke="${S1}" stroke-width="1.5" stroke-dasharray="4,3"/>
  <path d="M72,65 C64,75 62,90 68,100 C74,108 88,106 92,94 Z" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M128,65 C136,75 138,90 132,100 C126,108 112,106 108,94 Z" fill="none" stroke="${S2}" stroke-width="1.2"/>
  `),

  'left_arm-front': svg(`
  <path d="M65,8 L135,8 Q148,12 150,40 L148,200 Q144,225 135,240 Q118,270 100,272 Q82,270 65,240 Q56,225 52,200 L50,40 Q52,12 65,8 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <line x1="100" y1="10" x2="100" y2="268" stroke="${S2}" stroke-width="1.2" stroke-dasharray="4,3"/>
  <path d="M58,95 Q45,120 50,148" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M142,95 Q155,120 150,148" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <ellipse cx="100" cy="168" rx="42" ry="18" fill="none" stroke="${S1}" stroke-width="1.8"/>
  `),

  'left_arm-back': svg(`
  <path d="M65,8 L135,8 Q148,12 150,40 L148,200 Q144,225 135,240 Q118,270 100,272 Q82,270 65,240 Q56,225 52,200 L50,40 Q52,12 65,8 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <line x1="100" y1="10" x2="100" y2="268" stroke="${S2}" stroke-width="1.5" stroke-dasharray="4,3"/>
  <path d="M58,90 Q46,118 50,148" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M142,90 Q154,118 150,148" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M62,155 Q100,175 138,155" fill="none" stroke="${S1}" stroke-width="1.8"/>
  `),

  'left_arm-left': svg(`
  <path d="M75,8 L128,8 Q142,12 144,40 L142,205 Q138,228 128,242 Q110,272 100,273 Q88,272 72,242 Q62,228 58,205 L56,40 Q58,12 75,8 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <path d="M62,95 Q52,122 55,150" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M138,95 Q148,122 145,150" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <ellipse cx="100" cy="165" rx="38" ry="16" fill="none" stroke="${S1}" stroke-width="1.8"/>
  `),

  'left_arm-right': svg(`
  <path d="M72,8 L125,8 Q140,12 142,40 L140,205 Q136,228 125,242 Q108,272 100,273 Q90,272 75,242 Q65,228 60,205 L58,40 Q60,12 72,8 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <path d="M60,95 Q50,122 54,150" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M140,95 Q150,122 146,150" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <ellipse cx="100" cy="165" rx="38" ry="16" fill="none" stroke="${S1}" stroke-width="1.8"/>
  `),

  'left_hand-front': svg(`
  <path d="M55,8 Q55,8 60,100 Q62,115 70,120 L72,250 Q74,265 100,268 Q126,265 128,250 L130,120 Q138,115 140,100 Q145,8 145,8 Q130,5 118,8 L115,85 Q110,90 100,90 Q90,90 85,85 L82,8 Q70,5 55,8 Z" fill="${BG}" stroke="${S1}" stroke-width="2.2"/>
  <line x1="85" y1="8" x2="82" y2="85" stroke="${S2}" stroke-width="1.2"/>
  <line x1="100" y1="8" x2="100" y2="88" stroke="${S2}" stroke-width="1.2"/>
  <line x1="115" y1="8" x2="118" y2="85" stroke="${S2}" stroke-width="1.2"/>
  <path d="M72,250 Q100,262 128,250" fill="none" stroke="${S2}" stroke-width="1.2"/>
  `),

  'left_hand-back': svg(`
  <path d="M55,8 Q55,8 60,100 Q62,115 70,120 L72,250 Q74,265 100,268 Q126,265 128,250 L130,120 Q138,115 140,100 Q145,8 145,8 Q130,5 118,8 L115,85 Q110,90 100,90 Q90,90 85,85 L82,8 Q70,5 55,8 Z" fill="${BG}" stroke="${S1}" stroke-width="2.2"/>
  <line x1="85" y1="8" x2="82" y2="85" stroke="${S2}" stroke-width="1.2"/>
  <line x1="100" y1="8" x2="100" y2="88" stroke="${S2}" stroke-width="1.2"/>
  <line x1="115" y1="8" x2="118" y2="85" stroke="${S2}" stroke-width="1.2"/>
  <path d="M68,160 Q100,168 132,160" fill="none" stroke="${S2}" stroke-width="1.2"/>
  <path d="M68,200 Q100,208 132,200" fill="none" stroke="${S2}" stroke-width="1.2"/>
  `),

  'left_hand-left': svg(`
  <path d="M85,8 Q88,8 90,90 Q90,108 92,115 L93,252 Q94,266 100,268 Q106,266 107,252 L108,115 Q110,108 110,90 Q112,8 115,8 Q108,5 100,5 Q92,5 85,8 Z" fill="${BG}" stroke="${S1}" stroke-width="2.2"/>
  <path d="M80,120 Q72,140 75,170 Q78,195 85,210" fill="none" stroke="${S2}" stroke-width="1.5"/>
  `),

  'left_hand-right': svg(`
  <path d="M85,8 Q88,8 90,90 Q90,108 92,115 L93,252 Q94,266 100,268 Q106,266 107,252 L108,115 Q110,108 110,90 Q112,8 115,8 Q108,5 100,5 Q92,5 85,8 Z" fill="${BG}" stroke="${S1}" stroke-width="2.2"/>
  <path d="M120,120 Q128,140 125,170 Q122,195 115,210" fill="none" stroke="${S2}" stroke-width="1.5"/>
  `),

  'left_leg-front': svg(`
  <path d="M48,8 L152,8 Q165,12 166,42 L164,195 Q160,225 152,245 Q135,278 100,280 Q65,278 48,245 Q40,225 36,195 L34,42 Q35,12 48,8 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <line x1="100" y1="10" x2="100" y2="275" stroke="${S2}" stroke-width="1.2" stroke-dasharray="4,3"/>
  <path d="M42,105 Q32,130 36,158" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M158,105 Q168,130 164,158" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <ellipse cx="100" cy="178" rx="50" ry="22" fill="none" stroke="${S1}" stroke-width="2"/>
  <path d="M50,195 Q100,210 150,195" fill="none" stroke="${S2}" stroke-width="1.2"/>
  `),

  'left_leg-back': svg(`
  <path d="M48,8 L152,8 Q165,12 166,42 L164,195 Q160,225 152,245 Q135,278 100,280 Q65,278 48,245 Q40,225 36,195 L34,42 Q35,12 48,8 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <line x1="100" y1="10" x2="100" y2="275" stroke="${S2}" stroke-width="1.5" stroke-dasharray="4,3"/>
  <path d="M42,105 Q32,130 36,158" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M158,105 Q168,130 164,158" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M52,185 Q100,200 148,185" fill="none" stroke="${S1}" stroke-width="2"/>
  <path d="M58,230 Q100,245 142,230" fill="none" stroke="${S2}" stroke-width="1.5"/>
  `),

  'left_leg-left': svg(`
  <path d="M68,8 L132,8 Q148,12 150,42 L148,200 Q144,228 132,248 Q115,280 100,282 Q85,280 68,248 Q52,228 50,200 L48,42 Q50,12 68,8 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <path d="M60,105 Q50,130 54,158" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M140,105 Q150,130 146,158" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <ellipse cx="100" cy="175" rx="42" ry="18" fill="none" stroke="${S1}" stroke-width="2"/>
  `),

  'left_leg-right': svg(`
  <path d="M68,8 L132,8 Q148,12 150,42 L148,200 Q144,228 132,248 Q115,280 100,282 Q85,280 68,248 Q52,228 50,200 L48,42 Q50,12 68,8 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <path d="M60,105 Q50,130 54,158" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M140,105 Q150,130 146,158" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <ellipse cx="100" cy="175" rx="42" ry="18" fill="none" stroke="${S1}" stroke-width="2"/>
  `),

  'left_foot-front': svg(`
  <path d="M25,20 L175,20 Q185,25 185,55 L185,180 Q182,200 172,210 L165,218 Q145,240 120,250 Q105,255 90,250 Q65,240 40,215 L28,200 Q15,185 15,160 L15,55 Q15,25 25,20 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <path d="M38,215 Q55,242 80,250" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M80,250 Q100,256 120,250" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M140,230 Q158,218 168,200" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <line x1="68" y1="252" x2="65" y2="268" stroke="${S1}" stroke-width="2"/>
  <line x1="82" y1="255" x2="80" y2="272" stroke="${S1}" stroke-width="2"/>
  <line x1="96" y1="256" x2="95" y2="273" stroke="${S1}" stroke-width="2"/>
  <line x1="110" y1="254" x2="110" y2="270" stroke="${S1}" stroke-width="2"/>
  <line x1="122" y1="250" x2="124" y2="265" stroke="${S1}" stroke-width="2"/>
  `),

  'left_foot-back': svg(`
  <path d="M25,20 L175,20 Q185,25 185,55 L185,180 Q182,200 172,210 L165,218 Q145,240 120,250 Q105,255 90,250 Q65,240 40,215 L28,200 Q15,185 15,160 L15,55 Q15,25 25,20 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <path d="M25,60 Q100,45 175,60" fill="none" stroke="${S1}" stroke-width="2"/>
  <path d="M20,100 Q100,115 180,100" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M38,215 Q55,242 80,250" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M140,230 Q158,218 168,200" fill="none" stroke="${S2}" stroke-width="1.5"/>
  `),

  'left_foot-left': svg(`
  <path d="M30,20 Q75,15 100,18 Q130,15 165,25 Q180,35 180,65 L178,175 Q175,200 165,218 Q148,248 130,258 Q112,265 95,260 Q78,253 65,240 Q45,220 35,195 L25,165 L22,80 Q22,25 30,20 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <path d="M30,20 Q100,12 165,25" fill="none" stroke="${S1}" stroke-width="2"/>
  <path d="M65,238 Q82,258 100,262" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M22,145 Q20,168 25,188" fill="none" stroke="${S2}" stroke-width="1.5"/>
  `),

  'left_foot-right': svg(`
  <path d="M170,20 Q125,15 100,18 Q70,15 35,25 Q20,35 20,65 L22,175 Q25,200 35,218 Q52,248 70,258 Q88,265 105,260 Q122,253 135,240 Q155,220 165,195 L175,165 L178,80 Q178,25 170,20 Z" fill="${BG}" stroke="${S1}" stroke-width="2.5"/>
  <path d="M170,20 Q100,12 35,25" fill="none" stroke="${S1}" stroke-width="2"/>
  <path d="M135,238 Q118,258 100,262" fill="none" stroke="${S2}" stroke-width="1.5"/>
  <path d="M178,145 Q180,168 175,188" fill="none" stroke="${S2}" stroke-width="1.5"/>
  `),
}

// Mirror pairs: right side = horizontally flipped left side
const MIRROR = {
  'right_arm': 'left_arm',
  'right_hand': 'left_hand',
  'right_leg': 'left_leg',
  'right_foot': 'left_foot',
}

const VIEWS = {
  'left_arm': ['front','back','left','right'],
  'left_hand': ['front','back','left','right'],
  'left_leg': ['front','back','left','right'],
  'left_foot': ['front','back','left','right'],
}

// Generate mirrored right-side SVGs
for (const [right, left] of Object.entries(MIRROR)) {
  const views = VIEWS[left]
  for (const view of views) {
    const srcKey = `${left}-${view}`
    const src = BASE[srcKey]
    if (!src) continue
    // Extract inner content after the <rect> element
    const rectEnd = src.indexOf('/>') + 2
    const closeTag = src.lastIndexOf('</svg>')
    const inner = src.slice(rectEnd, closeTag).trim()
    // Mirror view labels: left↔right
    const mirrorView = view === 'left' ? 'right' : view === 'right' ? 'left' : view
    BASE[`${right}-${mirrorView}`] = svg(`
  <g transform="translate(200,0) scale(-1,1)">
    ${inner}
  </g>`)
  }
}

let count = 0
for (const [name, content] of Object.entries(BASE)) {
  writeFileSync(join(OUT, `${name}.svg`), content)
  count++
}
console.log(`Generated ${count} SVG files in public/body/`)
