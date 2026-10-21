import axios from 'axios';
import { db } from '../database';

export interface OciInstanceMetadata {
  displayName: string;
  id: string; // OCID
  shape: string;
  ocpus: number;
  memoryInGBs: number;
  networkingBandwidthInGbps: number;
  availabilityDomain: string;
  faultDomain: string;
  region: string;
  regionKey: string;
  canonicalRegionName: string;
  state: string;
  timeCreated: number;
  createdFormatted: string;
  compartmentId: string;
  image: string;
  privateIp: string;
  publicIp: string;
  vnicId: string;
  macAddr: string;
  isAlwaysFreeEligible: boolean;
  tenancyLimits: {
    maxArmOcpu: number;
    maxArmRamGb: number;
    maxStorageGb: number;
    maxBandwidthTb: number;
    maxPublicIps: number;
  };
  tenancyAllocated: {
    usedOcpu: number;
    usedRamGb: number;
    percentOcpu: number;
    percentRam: number;
    availableOcpu: number;
    availableRamGb: number;
  };
  isFromLiveImds: boolean;
  imdsStatus: 'ONLINE' | 'STALE' | 'OFFLINE';
  lastValidFetchAt: string;
  fetchedAt: string;
}

let cachedMetadata: OciInstanceMetadata | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds cache

export class OciService {
  private static IMDS_INSTANCE_URL = 'http://169.254.169.254/opc/v2/instance/';
  private static IMDS_VNICS_URL = 'http://169.254.169.254/opc/v2/vnics/';

  static async getInstanceMetadata(forceRefresh = false): Promise<OciInstanceMetadata> {
    const now = Date.now();
    if (!forceRefresh && cachedMetadata && (now - lastFetchTime < CACHE_TTL_MS)) {
      return cachedMetadata;
    }

    try {
      // Attempt to query live OCI IMDS v2
      const [instanceRes, vnicsRes] = await Promise.all([
        axios.get(this.IMDS_INSTANCE_URL, {
          headers: { Authorization: 'Bearer Oracle' },
          timeout: 2500
        }),
        axios.get(this.IMDS_VNICS_URL, {
          headers: { Authorization: 'Bearer Oracle' },
          timeout: 2500
        }).catch(() => ({ data: [] }))
      ]);

      const inst = instanceRes.data;
      const vnics = Array.isArray(vnicsRes.data) ? vnicsRes.data : [];
      const primaryVnic = vnics[0] || {};

      const ocpus = Number(inst.shapeConfig?.ocpus) || 2;
      const memoryInGBs = Number(inst.shapeConfig?.memoryInGBs) || 12;
      const timeCreated = Number(inst.timeCreated) || 1788952903101;
      const nowIso = new Date().toISOString();

      const metadata: OciInstanceMetadata = {
        displayName: inst.displayName || 'multivusvps',
        id: inst.id || 'ocid1.instance.oc1.sa-saopaulo-1.antxeljrtu5uzvycixdeslguvkhgz7tradcgwxyregxaa4eyy4tghaxrcgeq',
        shape: inst.shape || 'VM.Standard.A1.Flex',
        ocpus,
        memoryInGBs,
        networkingBandwidthInGbps: Number(inst.shapeConfig?.networkingBandwidthInGbps) || 2.0,
        availabilityDomain: inst.availabilityDomain || 'skln:SA-SAOPAULO-1-AD-1',
        faultDomain: inst.faultDomain || 'FAULT-DOMAIN-3',
        region: inst.region || 'sa-saopaulo-1',
        regionKey: inst.regionInfo?.regionKey || 'GRU',
        canonicalRegionName: inst.canonicalRegionName || 'sa-saopaulo-1',
        state: inst.state || 'Running',
        timeCreated,
        createdFormatted: new Date(timeCreated).toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          dateStyle: 'short',
          timeStyle: 'medium'
        }),
        compartmentId: inst.compartmentId || 'ocid1.tenancy.oc1..aaaaaaaaotrvdyuzakhjcuej7dbit7t2rrqmfogjycid2txarqz3ka4bjlbq',
        image: inst.image || 'ocid1.image.oc1.sa-saopaulo-1.aaaaaaaaizpqol2y2czfobdx6igjd7j7cwtcb5zegyfgbwhp4jd5j3pea5wq',
        privateIp: primaryVnic.privateIp || '10.0.0.34',
        publicIp: '147.15.19.44',
        vnicId: primaryVnic.vnicId || 'ocid1.vnic.oc1.sa-saopaulo-1.abtxeljrwtnu4dvop5ykiswndf7334c5hrjp4le7xdbjsaanj6coo7m2goma',
        macAddr: primaryVnic.macAddr || '02:00:17:03:4E:38',
        isAlwaysFreeEligible: true,
        tenancyLimits: {
          maxArmOcpu: 2,
          maxArmRamGb: 12,
          maxStorageGb: 200,
          maxBandwidthTb: 10,
          maxPublicIps: 2
        },
        tenancyAllocated: {
          usedOcpu: ocpus,
          usedRamGb: memoryInGBs,
          percentOcpu: Math.min(100, Math.round((ocpus / 2) * 100)),
          percentRam: Math.min(100, Math.round((memoryInGBs / 12) * 100)),
          availableOcpu: Math.max(0, 2 - ocpus),
          availableRamGb: Math.max(0, 12 - memoryInGBs)
        },
        isFromLiveImds: true,
        imdsStatus: 'ONLINE',
        lastValidFetchAt: nowIso,
        fetchedAt: nowIso
      };

      // Persist latest verified reading into sqlite database
      try {
        db.prepare("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('oci_live_metadata', ?, CURRENT_TIMESTAMP)").run(
          JSON.stringify(metadata)
        );
      } catch (e) {}

      cachedMetadata = metadata;
      lastFetchTime = now;
      return metadata;
    } catch (err) {
      // 1. Try to recover last successful reading from SQLite persistence
      try {
        const saved = (db.prepare("SELECT value FROM system_settings WHERE key = 'oci_live_metadata'").get() as any)?.value;
        if (saved) {
          const parsed = JSON.parse(saved) as OciInstanceMetadata;
          parsed.isFromLiveImds = false;
          parsed.imdsStatus = 'STALE';
          parsed.fetchedAt = new Date().toISOString();
          cachedMetadata = parsed;
          lastFetchTime = now;
          return parsed;
        }
      } catch (e) {}

      // 2. If no historical valid reading exists, return baseline with OFFLINE status
      const fallbackTimeCreated = 1788952903101;
      const nowIso = new Date().toISOString();
      const fallback: OciInstanceMetadata = {
        displayName: 'multivusvps',
        id: 'ocid1.instance.oc1.sa-saopaulo-1.antxeljrtu5uzvycixdeslguvkhgz7tradcgwxyregxaa4eyy4tghaxrcgeq',
        shape: 'VM.Standard.A1.Flex',
        ocpus: 2,
        memoryInGBs: 12,
        networkingBandwidthInGbps: 2.0,
        availabilityDomain: 'skln:SA-SAOPAULO-1-AD-1',
        faultDomain: 'FAULT-DOMAIN-3',
        region: 'sa-saopaulo-1',
        regionKey: 'GRU',
        canonicalRegionName: 'sa-saopaulo-1',
        state: 'Running',
        timeCreated: fallbackTimeCreated,
        createdFormatted: new Date(fallbackTimeCreated).toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          dateStyle: 'short',
          timeStyle: 'medium'
        }),
        compartmentId: 'ocid1.tenancy.oc1..aaaaaaaaotrvdyuzakhjcuej7dbit7t2rrqmfogjycid2txarqz3ka4bjlbq',
        image: 'ocid1.image.oc1.sa-saopaulo-1.aaaaaaaaizpqol2y2czfobdx6igjd7j7cwtcb5zegyfgbwhp4jd5j3pea5wq',
        privateIp: '10.0.0.34',
        publicIp: '147.15.19.44',
        vnicId: 'ocid1.vnic.oc1.sa-saopaulo-1.abtxeljrwtnu4dvop5ykiswndf7334c5hrjp4le7xdbjsaanj6coo7m2goma',
        macAddr: '02:00:17:03:4E:38',
        isAlwaysFreeEligible: true,
        tenancyLimits: {
          maxArmOcpu: 2,
          maxArmRamGb: 12,
          maxStorageGb: 200,
          maxBandwidthTb: 10,
          maxPublicIps: 2
        },
        tenancyAllocated: {
          usedOcpu: 2,
          usedRamGb: 12,
          percentOcpu: 100,
          percentRam: 100,
          availableOcpu: 0,
          availableRamGb: 0
        },
        isFromLiveImds: false,
        imdsStatus: 'OFFLINE',
        lastValidFetchAt: 'Desconhecido',
        fetchedAt: nowIso
      };

      cachedMetadata = fallback;
      lastFetchTime = now;
      return fallback;
    }
  }
}
