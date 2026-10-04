/* START observation model v1. Common metadata, explicitly different measurement payloads. */
(function (root) {
  'use strict';
  const finite = Number.isFinite;
  const clone = value => JSON.parse(JSON.stringify(value));
  const modalities = [
    {id:'radio',label:'Radio',description:'Antenna correlations, spectra, or intensity products. TART interferometry is operational.'},
    {id:'microwave',label:'Microwave',description:'Microwave maps, spectra, or time streams. Band definitions can overlap radio.'},
    {id:'submillimeter',label:'Sub-mm',description:'Submillimeter images, spectra, and interferometric products.'},
    {id:'infrared',label:'Infrared',description:'Filter-specific imagery, spectra, and catalogues.'},
    {id:'optical',label:'Visible',description:'Optical images, exposures, spectra, and catalogues.'},
    {id:'ultraviolet',label:'UV',description:'Ultraviolet imagery, spectra, and catalogues; not the radio u–v plane.'},
    {id:'xray',label:'X-ray',description:'Energy-selected photon events, spectra, exposure maps, and images.'},
    {id:'gamma',label:'Gamma',description:'High-energy events, light curves, spectra, and localization products.'},
    {id:'astrometry',label:'Astrometry / catalogues',description:'Positions, motions, distances, and catalogue uncertainties; not necessarily imagery.'},
    {id:'gravitational-wave',label:'Gravitational waves',description:'Detector strain, event times, and localization probability; not a conventional camera.'}
  ];
  const providers = new Map();
  function registerProvider(definition,adapter=null) {
    if(!definition.id||providers.has(definition.id))throw Error('Provider id must be unique');
    providers.set(definition.id,{...definition,adapter});
  }
  const tartDefinition={id:'tart',provider:'TART public API',mission:null,telescope:'Transient Array Radio Telescope',instrument:'Selected remote antenna array',modality:['radio'],wavelength_or_band:'GPS L1; frequency read from each observation',status:'operational',public_access:true,authentication_required:false,authentication_type:'None for public reads; protected settings are outside START',query_method:'REST GET /station/latest',coordinate_query_support:false,temporal_query_support:false,image_products:'Client-derived dirty image',catalog_products:'Predicted reference objects; auxiliary catalogue',spectral_products:false,event_products:false,raw_products:'Complex visibilities and station metadata',docs:'https://api.elec.ac.nz/docs/'};
  const futureProviders=[
    ['mast','MAST','Hubble / JWST / TESS / Kepler / GALEX',['optical','infrared','ultraviolet'],'https://archive.stsci.edu/'],
    ['gaia','ESA Gaia Archive','Gaia',['astrometry'],'https://gea.esac.esa.int/archive/'],
    ['sdss','SDSS','Sloan Digital Sky Survey',['optical'],'https://www.sdss.org/'],
    ['eso','ESO Science Archive','ESO instruments',['optical','infrared','submillimeter'],'https://archive.eso.org/'],
    ['irsa','NASA/IPAC IRSA','WISE / 2MASS / Spitzer / Herschel',['infrared','submillimeter'],'https://irsa.ipac.caltech.edu/'],
    ['koa','Keck Observatory Archive','Keck',['optical','infrared'],'https://koa.ipac.caltech.edu/'],
    ['chandra','Chandra Data Archive','Chandra',['xray'],'https://cxc.harvard.edu/cda/'],
    ['xmm','XMM-Newton Science Archive','XMM-Newton',['xray'],'https://www.cosmos.esa.int/web/xmm-newton/xsa'],
    ['heasarc','HEASARC','High-energy missions',['xray','gamma'],'https://heasarc.gsfc.nasa.gov/'],
    ['gwosc','GWOSC','LIGO / Virgo / KAGRA',['gravitational-wave'],'https://gwosc.org/'],
    ['nrao','NRAO Archive','VLA / VLBA / GBT',['radio'],'https://data.nrao.edu/'],
    ['lofar','LOFAR LTA','LOFAR',['radio'],'https://lta.lofar.eu/'],
    ['sarao','SARAO Archive','MeerKAT',['radio'],'https://archive.sarao.ac.za/'],
    ['ivoa','Virtual Observatory services','Provider-specific',['astrometry','optical','radio'],'https://www.ivoa.net/'],
    ['sol-local','SOL local instruments','Future local observatory',['radio'],null]
  ];
  function normalizeTart(payload) {
    if(!payload||!payload.observation||!Array.isArray(payload.observation.data))throw Error('No TART visibility record');
    const info=payload.info?.info||{},rawPositions=Array.isArray(payload.positions)?payload.positions:[];
    const elements=rawPositions.map((p,id)=>({id,label:`A${id}`,type:'antenna',coordinates:Array.isArray(p)&&p.length>=3&&p.slice(0,3).every(finite)?p.slice(0,3):null,receiverAssociation:null,operationalState:'unknown',orientation:null,frequencyRange:null,metadata:{upstreamIndex:id}}));
    const pairs=new Map();let rejected=0;
    for(const v of payload.observation.data){
      if(!v||!Number.isInteger(v.i)||!Number.isInteger(v.j)||v.i<0||v.j<0||v.i>=128||v.j>=128||v.i===v.j||!finite(v.re)||!finite(v.im)){rejected++;continue;}
      const i=Math.min(v.i,v.j),j=Math.max(v.i,v.j),key=`${i}:${j}`;
      if(pairs.has(key)){rejected++;continue;}
      pairs.set(key,{i,j,re:v.re,im:v.i===i?v.im:-v.im,id:key});
    }
    const rows=[...pairs.values()];if(!rows.length)throw Error('No usable complex visibility measurements');
    const freq=finite(info.operating_frequency)&&info.operating_frequency>0?info.operating_frequency:null;
    const timestamp=payload.observation.timestamp||null,station=payload.station||'unknown';
    const geometry={frame:'local-ENU',units:'m',elements,baselineRelationships:rows.map(v=>({id:v.id,elementIds:[v.i,v.j]})),orientation:{x:'east',y:'north',z:'up',authority:'TART position convention; station alignment not independently verified'},location:info.location||null};
    const calibration=payload.calibration||null;
    const hasSpatialSamples=!!freq&&rows.some(v=>elements[v.i]?.coordinates&&elements[v.j]?.coordinates);
    return {
      schemaVersion:'start.observation/1',id:`tart:${station}:${timestamp||'unknown'}`,provider:'tart',mission:null,
      instrument:{id:`tart:${station}`,name:info.name||station,type:'radio-interferometer',geometryRef:'geometry'},modality:'radio',target:{kind:'whole-upper-hemisphere',name:'Local radio sky'},
      coordinates:{frame:'local-horizontal',projection:'direction-cosine disk',axes:'east / north / up',stationLocation:info.location||null,celestialWCS:null},startTime:timestamp,endTime:null,
      spectralDomain:{type:'frequency',value:freq,unit:'Hz',bandwidth:finite(info.bandwidth)?info.bandwidth:null},
      processingLevel:'measured-complex-correlations',calibrationState:{status:'not-applied',available:!!calibration,solutionSource:'Station gain/phase endpoint',solutionTime:null,validated:false},
      geometry,measurements:{kind:'complex-visibilities',count:rows.length,rejectedOrDuplicateRows:rejected,units:'upstream correlation units; not Jy'},
      products:[{id:'visibilities',type:'complex-visibilities',processingLevel:'upstream',sourceUrl:payload.source||null,originalProductIdentifier:timestamp},
        {id:'station-metadata',type:'metadata',processingLevel:'upstream',sourceUrl:payload.source?.replace(/imaging\/vis$/,'info')||null},
        {id:'dirty-image',type:'derived-preview',processingLevel:'direct-Fourier-sum',sourceProduct:'visibilities',dimensions:[180,180],calibratedFlux:false}],
      provenance:{provider:'TART public API',telescope:'TART',station,observationId:timestamp,sourceAPI:payload.source||null,retrievalTimestamp:payload.retrieved_at||null,upstreamErrors:payload.upstream_errors||{},originalPayloadPreserved:true},
      modalityData:{radio:{visibilities:rows,antennaPositions:rawPositions,stationInfo:info,upstreamCalibration:calibration,predictedObjects:payload.objects||null}},
      capabilities:{antennaGeometry:elements.some(e=>e.coordinates),baselines:true,complexVisibilities:true,localSpatialFrequencies:hasSpatialSamples,dirtyImage:hasSpatialSamples,gainPhaseMetadata:!!calibration,catalogue:!!payload.objects?.items?.length,spectra:false,celestialRegistration:false,eventAssociation:false,rawExport:true},
      visualization:{renderer:'radio-interferometry',layers:[{id:'tart-dirty',product:'dirty-image',observationId:`tart:${station}:${timestamp||'unknown'}`,provider:'tart',instrument:info.name||station,observationTime:timestamp,spectralDomain:{type:'frequency',value:freq,unit:'Hz'},processingLevel:'direct-Fourier-sum',calibrationState:'uncalibrated',provenance:{sourceAPI:payload.source||null,retrievalTimestamp:payload.retrieved_at||null,originalProductIdentifier:timestamp},enabled:true,opacity:1,displayMapping:'relative false color, frame-scaled',coordinateFrame:'local-horizontal',registration:null}]},
      originalData:payload
    };
  }
  // Transitional radio renderer view. Network schema is isolated in normalizeTart.
  function radioView(observation){const r=observation.modalityData.radio;return {station:observation.provenance.station,source:observation.provenance.sourceAPI,retrieved_at:observation.provenance.retrievalTimestamp,observation:{timestamp:observation.startTime,data:r.visibilities},positions:r.antennaPositions,info:{info:r.stationInfo},calibration:r.upstreamCalibration,objects:r.predictedObjects,upstream_errors:observation.provenance.upstreamErrors};}
  function localSpatialSample(observation,pair){
    const a=observation.geometry.elements.find(e=>e.id===pair.i)?.coordinates,b=observation.geometry.elements.find(e=>e.id===pair.j)?.coordinates,f=observation.spectralDomain.value;
    if(!a||!b||!finite(f)||f<=0)return null;
    const meters=a.map((v,i)=>v-b[i]),wavelength=299792458/f;
    return {u:meters[0]/wavelength,v:meters[1]/wavelength,w:meters[2]/wavelength,lengthMeters:Math.hypot(...meters),deltaMeters:meters,wavelengthMeters:wavelength,frame:'local-ENU / zenith-referenced',units:'wavelengths',derived:true};
  }
  function assessComposite(observations){
    if(new Set(observations.map(o=>o.id)).size<2)return {ready:false,reason:'A registered composite needs at least two independent compatible observations.'};
    if(observations.some(o=>!o.coordinates.celestialWCS||!o.registration?.validated))return {ready:false,reason:'Celestial WCS and independently validated reprojection are required. The current TART product is local-horizontal.'};
    const frame=observations[0].registration.targetFrame;
    if(!frame||observations.some(o=>o.registration.targetFrame!==frame))return {ready:false,reason:'Registered target frames differ.'};
    return {ready:true,frame,layerObservationIds:observations.map(o=>o.id)};
  }
  registerProvider(tartDefinition,{normalize:normalizeTart,async acquire(station,signal){const response=await fetch('/api/start/observation/'+encodeURIComponent(station),{signal,cache:'no-store'});const payload=await response.json();if(!response.ok)throw Error(payload.error||'Observation unavailable');return normalizeTart(payload);}});
  for(const [id,provider,mission,modality,docs] of futureProviders)registerProvider({id,provider,mission,modality,docs,status:'not-integrated',telescope:null,instrument:null,wavelength_or_band:null,public_access:null,authentication_required:null,authentication_type:null,query_method:null,coordinate_query_support:null,temporal_query_support:null,image_products:null,catalog_products:null,spectral_products:null,event_products:null,raw_products:null});
  const renderers=new Map();
  const api={modalities,providers,registerProvider,normalizeTart,radioView,localSpatialSample,assessComposite,clone,renderers,registerRenderer:(id,renderer)=>{if(renderers.has(id))throw Error('Duplicate renderer');renderers.set(id,renderer);}};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StartModel=api;
})(typeof window!=='undefined'?window:globalThis);
