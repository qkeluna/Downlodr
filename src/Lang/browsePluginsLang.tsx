import { renderIcon } from '@/Utils/iconHelpers';

const sampleSvgIcon =
  '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="red" /></svg>';

const browsePluginsLang = [
  {
    id: 'format-converter',
    name: 'Format Converter',
    version: '1.0.0',
    description:
      'Converts videos to different formats using customizable quality and settings',
    author: 'Downlodr',
    icon: renderIcon(sampleSvgIcon, 'md', 'Format Converter'),
    downloads: '12.1k',
  },
  {
    id: 'metadata-exporter',
    name: 'Metadata Exporter',
    version: '1.0.0',
    description:
      'View and edit video metadata with powerful batch processing tools.',
    author: 'Downlodr',
    icon: renderIcon(sampleSvgIcon, 'md', 'Metadata Exporter'),
    downloads: '12.1k',
  },
  {
    id: 'cc-to-markdown',
    name: 'CC to Markdown',
    version: '1.0.0',
    description:
      'Converts videos to different formats using customizable quality and settings',
    author: 'Downlodr',
    icon: renderIcon(sampleSvgIcon, 'md', 'CC to Markdown'),
    downloads: '12.1k',
  },
];

export default browsePluginsLang;
